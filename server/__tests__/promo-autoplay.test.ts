// @vitest-environment node
import { expect, it } from 'vitest';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { convertPromoVideo } from '../promoVideo';
import { welcomeBubblePromoScript } from '../welcomeBubblePromoScript';

it('autoplays the converted video in actual widget markup without a click or audio', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'promo-browser-test-'));
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const server = createServer();
  try {
    const source = path.join(dir, 'source.mov');
    execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','testsrc2=size=180x320:rate=24','-f','lavfi','-i','sine','-t','3','-c:v','libx264','-threads','1','-c:a','aac',source]);
    const converted = await convertPromoVideo(source, dir, new AbortController().signal);
    const bytes = await readFile(converted.path);
    server.on('request', (_req,res)=>{res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':bytes.length});res.end(bytes);});
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const port = (server.address() as {port:number}).port;
    browser = await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']});
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<div id="popup" style="display:none;width:250px"></div>');
    await page.addScriptTag({content: welcomeBubblePromoScript});
    await page.evaluate(({ port }) => {
      (window as any).renderWelcomePromo(document.querySelector('#popup'), {
        promoImageEnabled: true, promoImageUrl: `http://127.0.0.1:${port}/promo.mp4`, promoClickAction: 'chat',
      }, `http://127.0.0.1:${port}`, () => { document.body.dataset.chatOpened = 'true'; });
    }, { port });
    await page.locator('#popup').evaluate(el=>{(el as HTMLElement).style.display='block';});
    await page.waitForFunction(()=>{const v=document.querySelector('video')!;return !v.paused && v.currentTime>0.2;},null,{timeout:15000});
    await page.getByRole('button', {name:'Open chat', exact:true}).click();
    expect(await page.locator('body').getAttribute('data-chat-opened')).toBe('true');
    expect(await page.locator('video').evaluate(v=>({muted:(v as HTMLVideoElement).muted,inline:(v as HTMLVideoElement).playsInline,loop:(v as HTMLVideoElement).loop}))).toEqual({muted:true,inline:true,loop:true});
  } finally {
    await browser?.close();
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await rm(dir,{recursive:true,force:true});
  }
},60000);
