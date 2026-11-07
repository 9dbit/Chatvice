import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { PROMO_VIDEO_MAX_BYTES, PROMO_VIDEO_MAX_SECONDS } from '../shared/promoMedia';

export class PromoMediaError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
// No playlists, URL protocols, image sequences, or external resource demuxers.
const inputOptions = ['-protocol_whitelist', 'file', '-format_whitelist', 'mov,matroska,webm,avi,asf,flv,mpeg,mpegts,ogg', '-probesize', '5000000', '-analyzeduration', '5000000'];
function run(binary: string, args: string[], signal: AbortSignal, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { signal, timeout: Math.max(1, timeout), killSignal: 'SIGKILL', maxBuffer: 512 * 1024 }, (error, stdout) => {
      if (!error) return resolve(stdout);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return reject(new PromoMediaError('Video conversion is temporarily unavailable. Please retry later.', 503));
      if (signal.aborted || error.killed) return reject(new PromoMediaError('Video conversion took too long or was cancelled. Try a shorter video.'));
      reject(new PromoMediaError('This video could not be decoded. Use an unprotected video file such as MOV, MP4, WebM, AVI or MKV.'));
    });
  });
}
export async function probePromoVideo(input: string, signal: AbortSignal, timeout = 10000) {
  const raw = await run('ffprobe', ['-v', 'error', '-max_alloc', '67108864', ...inputOptions, '-show_entries', 'stream=codec_type,codec_name,width,height,duration:stream_disposition=attached_pic:format=duration', '-of', 'json', input], signal, timeout);
  const info = JSON.parse(raw);
  const video = info.streams?.find((s: any) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const duration = Number(video?.duration || info.format?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0 || !video.width || !video.height) throw new PromoMediaError('Choose a video with a readable duration and video track.');
  return { duration, width: Number(video.width), height: Number(video.height), codec: video.codec_name, hasAudio: info.streams.some((s: any) => s.codec_type === 'audio') };
}
// The caller owns the private working directory and cleans it on every outcome.
export async function convertPromoVideo(input: string, workDir: string, signal: AbortSignal) {
  const deadline = Date.now() + 90000;
  const info = await probePromoVideo(input, signal);
  if (info.duration > PROMO_VIDEO_MAX_SECONDS) throw new PromoMediaError('Use a promo video of 2 minutes or less. Shorter clips retain more detail under 300 KB.');
  if (info.width > 8192 || info.height > 8192 || info.width * info.height > 33_554_432) throw new PromoMediaError('Use a video with a resolution of 8K or less.');
  const output = path.join(workDir, 'promo.mp4');
  for (let attempt = 0; attempt < 3; attempt++) {
    const edge = Math.max(160, Math.floor((info.duration > 30 ? 360 : 640) * Math.pow(0.75, attempt) / 2) * 2);
    const fps = attempt === 2 ? 12 : 24;
    const bitrate = Math.floor(265000 * Math.pow(0.75, attempt) * 8 / info.duration);
    const common = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-max_alloc', '67108864', '-threads', '2', ...inputOptions, '-i', input,
      '-map', '0:V:0', '-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1',
      '-vf', `setpts=PTS-STARTPTS,scale=w='min(${edge},iw)':h='min(${edge},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,fps=${fps}`,
      '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-threads', '2', '-filter_threads', '1', '-b:v', String(bitrate),
      '-maxrate', String(bitrate), '-bufsize', String(bitrate * 2)];
    if (Date.now() >= deadline || signal.aborted) throw new PromoMediaError('Video conversion took too long. Try a shorter video.');
    await run('ffmpeg', [...common, '-movflags', '+faststart', output], signal, deadline - Date.now());
    const bytes = (await stat(output)).size;
    if (bytes > 0 && bytes < PROMO_VIDEO_MAX_BYTES) {
      const verified = await probePromoVideo(output, signal);
      if (verified.codec !== 'h264' || verified.hasAudio || Math.abs(verified.duration - info.duration) > 0.5) throw new PromoMediaError('Video conversion could not preserve this clip. Try exporting it again.');
      return { path: output, bytes, duration: verified.duration };
    }
  }
  throw new PromoMediaError('Could not compress this video below 300 KB. Please use a shorter clip.');
}
