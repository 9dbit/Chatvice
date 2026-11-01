// Synthetic production-entry UX checks. No mailbox or provider is contacted.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import express from 'express';
import {chromium} from '@playwright/test';
const app=express();app.use('/assets',express.static(resolve('dist/mail-app/assets')));
app.get(['/', '/login', '/dashboard/mail'],(_req,res)=>res.sendFile(resolve('dist/mail-app/mail-app.html')));
const server=await new Promise(done=>{const s=app.listen(0,'127.0.0.1',()=>done(s));});
const origin=`http://127.0.0.1:${server.address().port}`;
const output=process.env.CHATVICE_MAIL_SMOKE_OUTPUT;if(output)await mkdir(output,{recursive:true});
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHATVICE_MAIL_BROWSER_PATH?{executablePath:process.env.CHATVICE_MAIL_BROWSER_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const openMenu=async()=>{const button=page.getByRole('button',{name:'Open mail menu'});if(await button.count())await button.click();};
 const closeMenu=async()=>{const drawer=page.getByRole('dialog',{name:'Workspace menu_'});if(await drawer.count())await drawer.getByRole('button',{name:'Close',exact:true}).click();};
 page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let signedIn=false,mailCalls=0;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const respond=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/mail-auth/session')return respond(signedIn?{email:'owner@example.invalid',admin:true}:{error:'Authentication required'},signedIn?200:401);
  if(path==='/api/mail-auth/login'){signedIn=true;return respond({email:'owner@example.invalid',admin:true});}
  if(path==='/api/mail-auth/logout'){signedIn=false;return respond({authenticated:false});}
  mailCalls++;
  if(!signedIn)return respond({error:'Authentication required'},401);
  if(path==='/api/mail/mailboxes')return respond([{id:'box1',local_part:'hello',domain:'example.invalid',display_name:'Example',enabled:true,can_write:true}]);
  if(path==='/api/mail/capabilities')return respond({admin:true,outbound:true,ai:false,attachments:false});
  if(path==='/api/mail/threads')return respond([{id:'thread1',subject:'A new idea, ready to share',from_email:'studio@example.invalid',text_body:'Hi team, the project details are ready for your review.',created_at:'2026-11-01T10:30:00Z',is_read:false,is_starred:false,message_count:1}]);
  if(path.endsWith('/activity'))return respond({counts:{unread:1,spam:0,drafts:0},unread:[],drafts:[],reminders:[]});
  if(path.endsWith('/stats'))return respond([{folder:'inbox',total:1,unread:1}]);
  if(path==='/api/mail/threads/thread1')return respond([{id:'message1',direction:'inbound',status:'received',from_email:'studio@example.invalid',to_emails:['hello@example.invalid'],subject:'A new idea, ready to share',text_body:'Hi team,\n\nThe project details are ready for your review. Everything you need is together in this conversation.\n\nTake a look when you have a moment, and let us know what you think.\n\nHere is the project link: https://example.invalid/project\n\nThank you,\nStudio team',created_at:'2026-11-01T10:30:00Z',is_read:false,is_starred:false}]);
  if(path.endsWith('/context'))return respond({sender:'studio@example.invalid',lead:null});
  return respond({error:'Unexpected fixture request'},404);
 });
 const screenshot=async(name)=>{if(output)await page.screenshot({path:resolve(output,name+'.png'),fullPage:!await page.getByRole('dialog').count()});};
 for(const width of [320,390,768,1024,1440,2560]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/');
  await page.getByRole('heading',{name:/LESS NOISE/i}).waitFor();
  await page.locator('.cm-site img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();}))); 
  assert.ok(await page.locator('.cm-hero-art').evaluate(image=>image.naturalWidth>0),'Generated hero must load');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Landing overflow at ${width}`);
  if(width===1440||width===390)await screenshot('mail-redesign-landing-'+width);
 }

 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/');
 assert.equal(await page.locator('.cm-hero-art').evaluate(el=>getComputedStyle(el).transform),'none','reduced motion disables parallax');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(1250,300);
 await page.waitForFunction(()=>parseFloat(document.querySelector('.cm-hero-art').style.getPropertyValue('--mail-depth-x'))>0);
 const depthBefore=await page.locator('.cm-hero-art').evaluate(el=>el.style.getPropertyValue('--mail-depth-y'));
 await page.evaluate(()=>window.scrollTo(0,200));
 await page.waitForFunction(before=>document.querySelector('.cm-hero-art').style.getPropertyValue('--mail-depth-y')!==before,depthBefore);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.scrollTo(0,0));
 assert.equal(mailCalls,0,'public landing must not request mailbox data');
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Use dark mode'}).click();
 assert.equal(await page.locator('html').getAttribute('data-mail-theme'),'dark');
 await page.reload();await page.getByRole('button',{name:'Use light mode'}).waitFor();
 await screenshot('mail-redesign-landing-dark');
 await page.getByRole('button',{name:'Use light mode'}).click();
 await page.getByRole('link',{name:'Sign in',exact:false}).first().click();
 await page.getByRole('heading',{name:'SIGN IN_'}).waitFor();
 await screenshot('mail-redesign-login-mobile');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByLabel('Email',{exact:true}).fill('owner@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('Synthetic-test-password-1234');
 await page.getByRole('button',{name:'Show password',exact:true}).click();
 assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
 await page.getByRole('button',{name:'Hide password',exact:true}).click();
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Compose',exact:false}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/dashboard/mail');
 for(const width of [320,390,768,1024,1440,2560]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Inbox overflow at ${width}`);
  const bounds=await page.locator('.mail-workspace').boundingBox();
  assert.equal(Math.round(bounds.width),width);assert.equal(Math.round(bounds.height),900);
  if(width===390||width===1440)await screenshot('mail-redesign-empty-'+width);
 }

 await page.setViewportSize({width:1440,height:1000});
 assert.equal(await page.locator('.mail-desktop-sidebar').count(),1);
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
 assert.equal(Math.round((await page.locator('.mail-desktop-sidebar').boundingBox()).width),64);await screenshot('mail-sidebar-collapsed');
 await page.reload();await page.getByRole('button',{name:'Expand sidebar',exact:true}).waitFor();
 await page.getByRole('button',{name:'Choose workspace',exact:true}).click();
 assert.equal(await page.getByRole('combobox',{name:'WORKSPACE'}).evaluate(el=>el===document.activeElement),true);
 await page.getByRole('link',{name:'Chatvice Mail home',exact:true}).click();
 await page.getByRole('heading',{name:/LESS NOISE/i}).waitFor();
 await page.getByRole('link',{name:'Open your inbox',exact:false}).click();
 await page.getByRole('button',{name:'Compose',exact:false}).waitFor();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(1200,300);
 await page.waitForFunction(()=>parseFloat(document.querySelector('.mail-empty-art').style.getPropertyValue('--mail-depth-x'))>0);
 await page.getByRole('button',{name:'Pause activity ticker',exact:true}).click();
 assert.equal(await page.locator('.mail-ticker-track').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'A new idea, ready to share',exact:false}).click();
 await page.locator('.mail-message-body').waitFor();
 await screenshot('mail-redesign-inbox-desktop');
 await openMenu();await page.getByRole('button',{name:'Use dark mode'}).click();await closeMenu();
 await screenshot('mail-redesign-inbox-dark');
 await openMenu();await page.getByRole('button',{name:'Use light mode'}).click();await closeMenu();
 for(const width of [320,390,768,1024,1440,2560]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Reader overflow at ${width}`);
 }
 await page.setViewportSize({width:390,height:844});
 await screenshot('mail-redesign-reader-mobile');
 await page.getByRole('button',{name:'Compose' ,exact:false}).click();
 await page.getByRole('dialog').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await screenshot('mail-redesign-compose-mobile');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await openMenu();
 await page.getByRole('button',{name:'Sign out',exact:true}).filter({visible:true}).click();
 await page.getByRole('heading',{name:'SIGN IN_'}).waitFor();
 assert.equal(signedIn,false);assert.deepEqual(errors,[]);
 console.log('PASS: landing, login, protected inbox, theme/sidebar persistence, desktop ticker, reduced-motion parallax, home link, compose and signout; 320–2560 px; synthetic accounts only');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
