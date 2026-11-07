// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { registerPromoUploadRoutes } from '../promoUploadRoutes';
import * as converter from '../promoVideo';
let dir: string, video: Buffer;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'promo-route-test-'));
  const file = path.join(dir, 'source.mov');
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=360x640:rate=24','-f','lavfi','-i','sine','-t','2','-c:v','libx264','-threads','1','-c:a','aac',file]);
  video = await readFile(file);
});
afterAll(async () => { await rm(dir,{recursive:true,force:true}); });
afterEach(() => vi.restoreAllMocks());
function setup() {
  const app = express(), save = vi.fn(async (_data: Buffer, name: string) => `/db-files/${name}`);
  registerPromoUploadRoutes(app, (req,res,next) => req.get('x-test-merchant') ? next() : void res.sendStatus(401), save);
  return { app, save };
}
function upload(app: express.Express) { return request(app).post('/api/upload/promo').set('Host','chatvice.test').set('Origin','http://chatvice.test').set('x-test-merchant','1'); }
it('requires merchant authentication and same-origin before decoding', async () => {
  const {app,save} = setup();
  await request(app).post('/api/upload/promo').expect(401);
  await request(app).post('/api/upload/promo').set('x-test-merchant','1').set('Origin','https://other.test').expect(403);
  expect(save).not.toHaveBeenCalled();
});
it('accepts iPhone MOV with a generic MIME, publishes only the converted MP4 and cleans private inputs', async () => {
  const {app,save} = setup();
  const before = (await readdir(tmpdir())).filter(s=>s.startsWith('chatvice-promo-'));
  const res = await upload(app).attach('file',video,{filename:'iPhone.mov',contentType:'application/octet-stream'}).field('type','welcome_bubble_promo').expect(200);
  expect(res.body).toMatchObject({mimeType:'video/mp4',muted:true});
  expect(res.body.bytes).toBeLessThan(300000);
  expect(res.body.url).toMatch(/^\/db-files\/welcome_bubble_promo_[a-f0-9-]+\.mp4$/);
  expect(save.mock.calls[0][0].length).toBe(res.body.bytes);
  await vi.waitFor(async () => expect((await readdir(tmpdir())).filter(s=>s.startsWith('chatvice-promo-'))).toEqual(before));
},30000);
it('preserves images and never publishes invalid files or failed conversions', async () => {
  const {app,save} = setup();
  const png = await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer();
  await upload(app).attach('file',png,{filename:'photo.png'}).expect(200);
  expect(save.mock.calls[0][0]).toEqual(png); save.mockClear();
  await upload(app).attach('file',Buffer.from('not video'),{filename:'fake.mov'}).expect(422);
  vi.spyOn(converter,'convertPromoVideo').mockRejectedValueOnce(new converter.PromoMediaError('Could not compress below 300 KB.'));
  await upload(app).attach('file',video,{filename:'source.mov'}).expect(422);
  expect(save).not.toHaveBeenCalled();
});
it('bounds simultaneous conversions and reports retryable capacity', async () => {
  const {app} = setup(); let release!:()=>void;
  const gate = new Promise<void>(resolve=>{release=resolve;});
  const spy = vi.spyOn(converter,'convertPromoVideo').mockImplementation(async ()=>{await gate;throw new converter.PromoMediaError('Test stopped');});
  const first = upload(app).attach('file',video,{filename:'a.mov'}).then(r=>r);
  const second = upload(app).attach('file',video,{filename:'b.mov'}).then(r=>r);
  try {
    await vi.waitFor(()=>expect(spy).toHaveBeenCalledTimes(2));
    const busy = await upload(app).expect(429);
    expect(busy.headers['retry-after']).toBe('10');
  } finally { release(); await Promise.all([first,second]); }
});
