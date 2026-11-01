// Production bundle + production CSP. Every account, message and attachment is synthetic.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import express from 'express';
import {chromium} from '@playwright/test';
const csp="default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self'; font-src 'self' data:; frame-ancestors 'none'; form-action 'self'";
const app=express();app.use((_q,r,n)=>{r.set('Content-Security-Policy',csp);n();});app.use('/assets',express.static(resolve('dist/mail-app/assets')));app.get(['/', '/dashboard/mail'],(_q,r)=>r.sendFile(resolve('dist/mail-app/mail-app.html')));
const server=await new Promise(done=>{const s=app.listen(0,'127.0.0.1',()=>done(s));});const origin=`http://127.0.0.1:${server.address().port}`;
const output=process.env.CHATVICE_MAIL_SMOKE_OUTPUT;if(output)await mkdir(output,{recursive:true});
function makePdf(){const content='BT /F1 20 Tf 30 100 Td (Synthetic attachment preview) Tj ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];let s='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(s);s+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(s);}
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHATVICE_MAIL_BROWSER_PATH?{executablePath:process.env.CHATVICE_MAIL_BROWSER_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const openMenu=async()=>{const button=page.getByRole('button',{name:'Open mail menu'});if(await button.count())await button.click();};
 const closeMenu=async()=>{const drawer=page.getByRole('dialog',{name:'Workspace menu_'});if(await drawer.count())await drawer.getByRole('button',{name:'Close',exact:true}).click();};
 page.setDefaultTimeout(15000);
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('blob:'))external.push(r.url());});
 let files=[],draft=null,composeCalls=0,sendCalls=0,uploads=0,reminders=[],viewer=false,blockNext=false,slowNextUpload=false;
 const payloads=new Map();const unread=Array.from({length:10},(_,i)=>({id:`unread-${i}`,thread_id:'thread1',subject:`Unread ${i+1}: design handoff`,from_email:`studio${i+1}@example.invalid`,text_body:'Please review the attached project details and share your feedback.',created_at:'2026-11-01T10:00:00Z'}));
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method();const respond=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/mail-auth/session')return respond({email:'owner@example.invalid',admin:!viewer});
  if(path==='/api/mail/capabilities')return respond({admin:!viewer,outbound:true,ai:false,attachments:true});
  if(path==='/api/mail/mailboxes')return respond([{id:'box1',local_part:'hello',domain:'example.invalid',display_name:'Studio',enabled:true,can_write:!viewer}]);
  if(path.endsWith('/stats'))return respond([{folder:'inbox',total:14,unread:12},{folder:'spam',total:3,unread:2},{folder:'drafts',total:draft?1:0,unread:0}]);
  if(path.endsWith('/activity'))return respond({counts:{unread:12,spam:3,drafts:draft?1:0},unread,drafts:draft?[{id:draft.id,subject:draft.subject}]:[],reminders});
  if(path.endsWith('/reminders')&&method==='POST'){const data=req.postDataJSON();reminders.push({id:'reminder1',title:data.title,due_date:data.dueDate});return respond({id:'reminder1'},201);}
  if(path.endsWith('/reminders/reminder1')&&method==='DELETE'){reminders=[];return respond({removed:true});}
  if(path==='/api/mail/threads')return respond([{id:'thread1',subject:'Project files for review',from_email:'studio@example.invalid',text_body:'Let’s review the next release.',created_at:'2026-11-01T10:00:00Z',is_read:false,is_starred:false,message_count:1}]);
  if(path.endsWith('/context'))return respond({sender:'studio@example.invalid',lead:null});
  if(path==='/api/mail/threads/thread1')return respond([{id:'message1',status:'received',direction:'inbound',subject:'Project files for review',from_email:'studio@example.invalid',to_emails:['hello@example.invalid'],cc_emails:[],text_body:'Hi team,\n\nPlease share the files for the next release.',created_at:'2026-11-01T10:00:00Z'}]);
  if(path==='/api/mail/compose'){composeCalls++;draft={...req.postDataJSON(),id:'draft1'};return respond({id:'draft1'},201);}
  if(path==='/api/mail/drafts/draft1'){if(method==='PATCH')Object.assign(draft,req.postDataJSON());return respond(draft);}
  if(path==='/api/mail/drafts/draft1/send'){sendCalls++;return respond({queued:true});}
  if(path==='/api/mail/messages/message1/attachments')return respond([]);
  if(path==='/api/mail/messages/draft1/attachments'){
   if(method==='POST'){
    if(slowNextUpload){slowNextUpload=false;await new Promise(done=>setTimeout(done,900));}
    if(req.failure())return; // XHR was aborted: the fake server must not save cancelled bytes.
    const fd=await new Request(req.url(),{method:'POST',headers:req.headers(),body:req.postDataBuffer()}).formData();const file=fd.get('file'),id='file-'+(++uploads);payloads.set(id,Buffer.from(await file.arrayBuffer()));files.push({id,original_filename:file.name,media_type:file.type,size_bytes:file.size,scan_status:blockNext?'pending':'clean'});blockNext=false;return respond({id},201);
   }return respond(files);
  }
  const fileId=path.split('/')[4];
  if(path.endsWith('/download')){const file=files.find(f=>f.id===fileId);assert.equal(file.scan_status,'clean','pending or blocked bytes must never be fetched');return route.fulfill({status:200,contentType:'application/octet-stream',body:payloads.get(fileId)});}
  if(path.endsWith('/rescan')){files.find(f=>f.id===fileId).scan_status='blocked';return respond({scanStatus:'blocked'});}
  if(path.startsWith('/api/mail/attachments/')&&method==='DELETE'){files=files.filter(f=>f.id!==fileId);return respond({removed:true});}
  return respond({error:`Unexpected ${method} ${path}`},404);
 });
 const shot=async name=>{if(output)await page.screenshot({path:resolve(output,name+'.png')});};
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Unexpected horizontal overflow');
 await page.goto(origin+'/dashboard/mail');await page.getByRole('button',{name:'Compose',exact:false}).waitFor();
 assert.equal(await page.locator('.mail-desktop-activity').count(),1,'desktop ticker is present');
 await page.getByRole('button',{name:'Unread inbox count: 12',exact:true}).waitFor();
 assert.equal(await page.locator('.mail-ticker-copy').first().locator('button').count(),10);
 assert.equal(await page.locator('.mail-ticker-track').evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion stops ticker');
 await openMenu();await page.getByRole('button',{name:'Open activity and subscription reminders'}).click();
 await page.getByRole('button',{name:'Inbox unread: 12',exact:true}).waitFor();await page.getByRole('button',{name:'Spam emails: 3',exact:true}).waitFor();
 assert.equal(await page.locator('.mail-activity-row').count(),10);
 const activity=page.getByRole('dialog',{name:'Mailbox activity_'});
 await activity.getByLabel('Subscription name').fill('Domain renewal');await activity.getByLabel('Renewal date').fill('2027-04-18');await activity.getByRole('button',{name:'Add reminder'}).click();await activity.getByRole('button',{name:'Complete reminder Domain renewal'}).waitFor();await shot('retro-activity-desktop');await activity.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:/Compose/}).click();await page.getByLabel('Recipients',{exact:true}).fill('studio@example.invalid');await page.getByLabel('Subject',{exact:true}).fill('Files for the next release');await page.getByLabel('Message',{exact:true}).fill('Hi team,\n\nHere are the photos, video and documents for review.\n\nThank you!');
 const photo=await readFile('client/src/assets/mail-retro/hero.webp'),video=await readFile('scripts/fixtures/mail-preview-video.mp4');
 // Cancel one queued file and one active XHR, without interrupting the next file.
 // The per-file X buttons must not discard the compose draft or the other files.
 slowNextUpload=true;
 const cancelledRequest=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/mail/messages/draft1/attachments'&&req.method()==='POST');
 await page.getByLabel('Upload attachments',{exact:true}).setInputFiles([
  {name:'Cancel active.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(8192,65)},
  {name:'Cancel queued.txt',mimeType:'text/plain',buffer:Buffer.from('Never upload this queued item')},
  {name:'Keep uploading.txt',mimeType:'text/plain',buffer:Buffer.from('Kept and verified')}
 ]);
 await cancelledRequest;
 await page.getByRole('progressbar',{name:'Upload Cancel active.bin'}).waitFor();
 assert.equal(await page.getByRole('progressbar',{name:'Upload Cancel queued.txt'}).getAttribute('aria-valuenow'),'0');
 await page.getByRole('button',{name:'Cancel upload Cancel queued.txt'}).click();
 await page.getByRole('button',{name:'Cancel upload Cancel active.bin'}).click();
 await page.getByRole('button',{name:'Preview Keep uploading.txt'}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('input[type=file]').disabled);
 await page.waitForTimeout(950);
 assert.deepEqual(files.map(f=>f.original_filename),['Keep uploading.txt'],'cancelled files are not persisted');
 assert.equal(await page.getByRole('progressbar',{name:'Upload Keep uploading.txt'}).getAttribute('aria-valuenow'),'100');
 await page.getByText('Upload cancelled. Other files continue.',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Remove Keep uploading.txt'}).click();
 await page.getByRole('button',{name:'Preview Keep uploading.txt'}).waitFor({state:'hidden'});
 assert.equal(files.length,0);
 uploads=0;payloads.clear(); // Reset synthetic fixture counters for the existing acceptance contract.
 slowNextUpload=true;
 await page.getByLabel('Upload attachments',{exact:true}).setInputFiles([{name:'Product photo.webp',mimeType:'image/webp',buffer:photo},{name:'Short demo.mp4',mimeType:'video/mp4',buffer:video},{name:'Project brief.pdf',mimeType:'application/pdf',buffer:makePdf()},{name:'Release notes.txt',mimeType:'text/plain',buffer:Buffer.from('Release checklist\n1. Review assets\n2. Confirm the release')}]);
 await page.getByRole('button',{name:'Close',exact:true}).isDisabled().then(disabled=>assert.equal(disabled,true,'closing while upload is active must be blocked'));
 const barDuringUpload=page.getByRole('progressbar',{name:'Upload Product photo.webp'});
 await barDuringUpload.waitFor();
 await page.getByRole('progressbar',{name:'Upload Short demo.mp4'}).waitFor();
 assert.equal(await page.getByRole('progressbar',{name:'Upload Short demo.mp4'}).getAttribute('aria-valuenow'),'0','each waiting attachment gets its own progressbar');
 assert.ok(Number(await barDuringUpload.getAttribute('aria-valuenow'))<100,'per-file progress stays below 100 until acknowledged');
 await page.getByRole('button',{name:'Preview Release notes.txt',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('input[type=file]').disabled);assert.equal(composeCalls,1,'adding several files creates only one draft');assert.equal(uploads,4);
 for(const name of ['Product photo.webp','Short demo.mp4','Project brief.pdf','Release notes.txt']){
  const row=page.getByRole('progressbar',{name:`Upload ${name}`});
  await row.waitFor();
  assert.equal(await row.getAttribute('aria-valuenow'),'100',`Per-file 100% after accepted upload: ${name}`);
 }
 await page.getByText('Uploaded successfully',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Preview Product photo.webp',exact:true}).click();await page.locator('.mail-preview-image').evaluate(img=>img.decode());await page.locator('.mail-file-thumb img').first().evaluate(img=>img.decode());
 const writing=await page.locator('.mail-compose-writing').boundingBox(),preview=await page.locator('.mail-attachment-workbench').boundingBox();assert.ok(preview.x>=writing.x+writing.width-1,'desktop preview must occupy right column');await shot('retro-compose-photo-desktop');
 await page.getByRole('button',{name:'Preview Short demo.mp4',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mail-preview-video')?.readyState>=1);assert.equal(await page.locator('.mail-preview-video').getAttribute('autoplay'),null);await shot('retro-compose-video-desktop');
 await page.getByRole('button',{name:'Preview Project brief.pdf',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mail-pdf-preview canvas')?.width>300);await page.getByText('Page 1 / 1',{exact:true}).waitFor();await shot('retro-compose-pdf-desktop');
 await page.getByRole('button',{name:'Preview Release notes.txt',exact:true}).click();await page.locator('.mail-preview-text').filter({hasText:'Release checklist'}).waitFor();
 // A later quarantine verdict invalidates an already-cached thumbnail and its bytes.
 files.find(f=>f.original_filename==='Product photo.webp').scan_status='blocked';
 // Spoofed MIME or extension never becomes executable markup or an image element.
 await page.getByLabel('Upload attachments',{exact:true}).setInputFiles({name:'fake-image.png',mimeType:'image/png',buffer:Buffer.from('<svg onload="window.__unsafePreview=true"></svg>')});await page.getByRole('button',{name:'Preview fake-image.png',exact:true}).click();await page.getByText('Preview is not available for this format.',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>window.__unsafePreview),undefined);assert.equal(await page.getByRole('button',{name:'Preview Product photo.webp',exact:true}).locator('img').count(),0,'quarantined cached photos must lose their thumbnail');files.find(f=>f.original_filename==='Product photo.webp').scan_status='clean';await page.getByRole('button',{name:'Remove fake-image.png',exact:true}).click();await page.getByRole('button',{name:'Preview fake-image.png',exact:true}).waitFor({state:'hidden'});
 blockNext=true;await page.getByLabel('Upload attachments',{exact:true}).setInputFiles({name:'Awaiting scan.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic pending file')});await page.getByRole('button',{name:'Retry scan for Awaiting scan.txt'}).waitFor();assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Retry scan for Awaiting scan.txt'}).click();await page.getByText('This file was blocked.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Remove Awaiting scan.txt'}).click();await page.getByRole('button',{name:'Preview Awaiting scan.txt'}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Preview Product photo.webp',exact:true}).click();
 for(const width of [320,390,768,1024,1440,2560]){await page.setViewportSize({width,height:900});await noOverflow();await page.waitForFunction(expected=>document.querySelectorAll('.mail-desktop-activity').length===expected,width>900?1:0);const footer=await page.locator('.mail-compose-footer').boundingBox();assert.ok(footer.y+footer.height<=901,'send actions remain within viewport');}
 await page.setViewportSize({width:390,height:844});await shot('retro-compose-mobile');await page.locator('.mail-attachment-workbench').scrollIntoViewIfNeeded();await shot('retro-attachments-mobile');await page.getByRole('button',{name:'Expand attachment preview'}).click();const expanded=page.getByRole('dialog',{name:'Product photo.webp'});await expanded.waitFor();await noOverflow();await shot('retro-expanded-mobile');await expanded.getByRole('button',{name:'Close',exact:true}).click();
 // Count limits must not reject a batch of ordinary small files.
 await page.getByLabel('Upload attachments',{exact:true}).setInputFiles(Array.from({length:12},(_,i)=>({name:`Extra ${i+1}.txt`,mimeType:'text/plain',buffer:Buffer.from(`Synthetic ${i}`)})));
 await page.getByRole('button',{name:'Preview Extra 12.txt',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('input[type=file]').disabled);
 assert.equal(files.length,16);assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).isDisabled(),false);
 const originalFiles=files.slice(),beforeLimitUploads=uploads;
 const used=files.reduce((n,f)=>n+f.size_bytes,0),remaining=40_000_000-used;
 await page.getByLabel('Upload attachments',{exact:true}).setInputFiles({name:'Budget boundary.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(remaining,65)});
 await page.getByRole('button',{name:'Preview Budget boundary.bin',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('input[type=file]').disabled);
 assert.equal(uploads,beforeLimitUploads+1);assert.equal(files.reduce((n,f)=>n+f.size_bytes,0),40_000_000);
 assert.equal(await page.getByRole('progressbar',{name:'Upload Budget boundary.bin'}).getAttribute('aria-valuenow'),'100','large file completes only after server acknowledgement');
 await page.getByLabel('Attachment storage used').filter({hasText:'40.00 MB / 40 MB used'}).waitFor();await page.getByText(/Secure-link delivery:/).waitFor();
 await page.getByLabel('Upload attachments',{exact:true}).setInputFiles({name:'Over budget.txt',mimeType:'text/plain',buffer:Buffer.from('x')});
 await page.getByRole('alert').filter({hasText:'Attachments exceed 40 MB total per email.'}).waitFor();assert.equal(uploads,beforeLimitUploads+1,'over-limit files never upload');
 await page.getByRole('button',{name:'Remove Budget boundary.bin',exact:true}).click();await page.getByRole('button',{name:'Preview Budget boundary.bin',exact:true}).waitFor({state:'hidden'});
 assert.equal(files.length,originalFiles.length);await shot('attachments-40mb-mobile');
 await page.getByLabel('Message',{exact:true}).fill('Updated after uploads. Closing must preserve every file and text edit.');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(draft.text,'Updated after uploads. Closing must preserve every file and text edit.');
 await openMenu();await page.getByRole('button',{name:'Open activity and subscription reminders'}).click();await activity.getByRole('button',{name:/Files for the next release/}).click();await page.getByRole('dialog',{name:'Edit draft'}).waitFor();await page.getByRole('button',{name:'Preview Product photo.webp'}).waitFor();
 assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'Updated after uploads. Closing must preserve every file and text edit.');
 assert.equal(composeCalls,1,'autosaved drafts with attachments never create a duplicate');
 await page.getByRole('button',{name:'Send message',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sendCalls,1);assert.equal(composeCalls,1);
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/Project files for review/}).click();await page.getByRole('button',{name:'Reply to studio',exact:true}).click();await page.getByLabel('Upload attachments').setInputFiles({name:'Reply notes.txt',mimeType:'text/plain',buffer:Buffer.from('Reply attachment')});await page.getByRole('button',{name:'Preview Reply notes.txt'}).waitFor();assert.equal(draft.replyToId,'message1','auto-created reply draft preserves reply headers');assert.equal(composeCalls,2);await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.reload();await openMenu();await page.getByRole('button',{name:'Open activity and subscription reminders'}).click();await activity.getByRole('button',{name:'Complete reminder Domain renewal'}).click();await activity.getByText('No reminders yet.').waitFor();await activity.getByRole('button',{name:'Close',exact:true}).click();
 viewer=true;await page.reload();await page.getByRole('button',{name:/Compose/}).waitFor();assert.equal(await page.getByRole('button',{name:/Compose/}).isDisabled(),true);await openMenu();await page.getByRole('button',{name:'Open activity and subscription reminders'}).click();assert.equal(await activity.getByRole('button',{name:'Add reminder'}).count(),0);
 assert.deepEqual(external,[],'previews, fonts, images and PDF worker are private/same-origin');assert.deepEqual(errors,[]);console.log('PASS: retro per-file upload progress and X cancellation preserve other files, close persists edits and attachments, thumbnails, right-column image/video/PDF/text previews, unsafe MIME fallback, scan gating, draft resume, reply attachment, desktop ticker and menu activity counts/top 10, reminders, readonly and 320–2560px layout under production CSP');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
