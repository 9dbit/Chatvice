import type { Express, RequestHandler } from 'express';
import multer from 'multer';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { convertPromoVideo, PromoMediaError } from './promoVideo';
import { PROMO_IMAGE_MAX_BYTES, PROMO_UPLOAD_MAX_BYTES } from '../shared/promoMedia';

type SavePromo = (data: Buffer, filename: string, mime: string) => Promise<string>;
export function registerPromoUploadRoutes(app: Express, requireMerchant: RequestHandler, save: SavePromo) {
  let inFlight = 0;
  const sameOrigin: RequestHandler = (req, res, next) => {
    const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : `${req.protocol}://${req.get('host')}`;
    if (req.get('origin') !== expected) return res.status(403).json({ error: 'Same-origin upload required.' });
    next();
  };
  app.post('/api/upload/promo', requireMerchant, sameOrigin, async (req, res) => {
    if (inFlight >= 2) return res.status(429).set('Retry-After', '10').json({ error: 'Video processing is busy. Please retry in a few seconds.' });
    inFlight++;
    let workDir: string | undefined;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    req.once('aborted', cancel);
    res.once('close', cancel);
    try {
      workDir = await mkdtemp(path.join(tmpdir(), 'chatvice-promo-'));
      const upload = multer({ dest: workDir, limits: { fileSize: PROMO_UPLOAD_MAX_BYTES, files: 1, fields: 1, parts: 2 } }).single('file');
      await new Promise<void>((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve()));
      if (!req.file || !req.file.size) throw new PromoMediaError('Choose an image or video to upload.', 400);
      if (controller.signal.aborted) return;
      // Inspect bytes, not the browser MIME/extension (iPhone Photos may use MOV).
      const metadata = await sharp(req.file.path, { limitInputPixels: 40_000_000 }).metadata().catch(() => null);
      const imageFormats: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
      let data: Buffer, mime: string, extension: string;
      if (metadata?.format && imageFormats[metadata.format]) {
        if (req.file.size > PROMO_IMAGE_MAX_BYTES) throw new PromoMediaError('Use an image smaller than 5 MB.', 413);
        data = await readFile(req.file.path); mime = imageFormats[metadata.format]; extension = metadata.format;
      } else {
        const converted = await convertPromoVideo(req.file.path, workDir, controller.signal);
        data = await readFile(converted.path); mime = 'video/mp4'; extension = 'mp4';
      }
      if (controller.signal.aborted) return;
      const filename = `welcome_bubble_promo_${randomUUID()}.${extension}`;
      const url = await save(data, filename, mime);
      res.json({ url, bytes: data.length, mimeType: mime, muted: mime === 'video/mp4' });
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof multer.MulterError) res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Use a video smaller than 50 MB.' : 'Upload one file at a time.' });
        else if (error instanceof PromoMediaError) res.status(error.status).json({ error: error.message });
        else res.status(500).json({ error: 'Unable to save this promo. Please retry.' });
      }
    } finally {
      req.off('aborted', cancel); res.off('close', cancel);
      if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
      inFlight--;
    }
  });
}
