// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { convertPromoVideo, probePromoVideo } from '../promoVideo';
let dir: string;
beforeAll(async () => { dir = await mkdtemp(path.join(tmpdir(), 'promo-test-')); });
afterAll(async () => { await rm(dir, { recursive: true, force: true }); });
it.each([['mov','libx264'], ['mp4','libx265'], ['webm','libvpx-vp9'], ['avi','mpeg4'], ['mkv','libx264'], ['wmv','wmv2']])('converts real %s bytes to a complete silent fast-start H.264 MP4 under 300000 bytes', async (ext, codec) => {
  const work = path.join(dir, ext); await mkdir(work);
  const input = path.join(work, `source.${ext}`);
  execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=24','-f','lavfi','-i','sine=frequency=440','-t','4','-c:v',codec,'-threads','1', ...(codec === 'libx265' ? ['-x265-params','pools=1:frame-threads=1:log-level=error'] : []), '-c:a', ext === 'webm' ? 'libopus' : ext === 'wmv' ? 'wmav2' : 'aac', input], { timeout: 30000, stdio: 'ignore' });
  const result = await convertPromoVideo(input, work, new AbortController().signal);
  expect(result.bytes).toBeLessThan(300000);
  const info = await probePromoVideo(result.path, new AbortController().signal);
  expect(info).toMatchObject({codec:'h264',hasAudio:false});
  expect(info.duration).toBeCloseTo(4, 0);
  const output = await readFile(result.path);
  expect(output.indexOf('moov')).toBeLessThan(output.indexOf('mdat'));
}, 60000);
it('rejects disguised invalid files, playlists, missing video, and overlong clips', async () => {
  const bad = path.join(dir, 'bad.mp4');
  await writeFile(bad, 'not video');
  await expect(convertPromoVideo(bad, dir, new AbortController().signal)).rejects.toThrow(/could not be decoded/);
  await writeFile(bad, '#EXTM3U\n#EXTINF:10\nhttp://127.0.0.1/private\n');
  await expect(convertPromoVideo(bad, dir, new AbortController().signal)).rejects.toThrow(/could not be decoded/);
  const audio = path.join(dir, 'audio.mp4');
  execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','sine','-t','1','-c:a','aac',audio]);
  await expect(convertPromoVideo(audio, dir, new AbortController().signal)).rejects.toThrow(/video track/);
  const long = path.join(dir, 'long.mp4');
  execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','color=size=32x32:rate=1','-t','121','-c:v','libx264','-threads','1',long]);
  await expect(convertPromoVideo(long, dir, new AbortController().signal)).rejects.toThrow(/2 minutes/);
}, 30000);
it('honors cancellation without returning a publishable result', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(convertPromoVideo(path.join(dir, 'mov/source.mov'), dir, controller.signal)).rejects.toThrow(/cancelled/);
});
