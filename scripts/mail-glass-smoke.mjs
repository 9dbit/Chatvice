// Production entry, synthetic data only. No real email, file or DNS operation.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import express from 'express';
import {chromium} from '@playwright/test';
const app=express();app.use('/assets',express.static(resolve('dist/mail-app/assets')));
app.get(['/', '/login', '/dashboard/mail', '/dashboard/mail/admin'],(_req,res)=>res.sendFile(resolve('dist/mail-app/mail-app.html')));
const server=await new Promise(done=>{const s=app.listen(0,'127.0.0.1',()=>done(s));});
const origin=`http://127.0.0.1:${server.address().port}`;
const output=process.env.CHATVICE_MAIL_SMOKE_OUTPUT;if(output)await mkdir(output,{recursive:true});
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHATVICE_MAIL_BROWSER_PATH?{executablePath:process.env.CHATVICE_MAIL_BROWSER_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const domains=[{id:'domain1',domain:'example.invalid',status:'verified'}];
 const boxes=[{id:'box1',local_part:'hello',domain:'example.invalid',display_name:'Customer team',enabled:true,can_write:true}];
 const files=[{id:'file-clean',original_filename:'Project brief.pdf',size_bytes:34000,media_type:'application/pdf',scan_status:'clean'},{id:'file-pending',original_filename:'Design notes.txt',size_bytes:2000,media_type:'text/plain',scan_status:'pending'},{id:'file-blocked',original_filename:'Blocked file.zip',size_bytes:4200,media_type:'application/zip',scan_status:'blocked'}];
 let aliases=[],members=[],rescanCalls=0,createCalls=0,verifyCalls=0,aiCalls=0;
 await page.route('**/api/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
  const respond=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  const data=()=>req.postDataJSON();
  if(path==='/api/mail-auth/session')return respond({email:'owner@example.invalid',admin:true});
  if(path==='/api/mail/capabilities')return respond({admin:true,outbound:true,ai:true,attachments:true});
  if(path==='/api/mail/domains'){if(method==='POST')domains.push({id:'domain2',domain:data().domain,status:'pending'});return respond(domains);}
  if(path==='/api/mail/mailboxes'){if(method==='POST'){createCalls++;boxes.push({id:'box2',local_part:data().localPart,display_name:data().displayName,domain:'example.invalid',enabled:true,can_write:true});}return respond(boxes);}
  if(path==='/api/mail/mailboxes/box1'&&method==='PATCH'){Object.assign(boxes[0],data().displayName!==undefined?{display_name:data().displayName}:{enabled:data().enabled});return respond(boxes[0]);}
  if(path==='/api/mail/domains/domain1/dns')return respond({type:'TXT',host:'_chatvice.example.invalid',value:'chatvice-verification=synthetic-only',status:'verified'});
  if(path==='/api/mail/domains/domain1/verify'){verifyCalls++;return respond({verified:true});}
  if(path.endsWith('/aliases')){if(method==='POST')aliases.push({id:'alias1',local_part:data().localPart,domain:'example.invalid'});return respond(aliases);}
  if(path.endsWith('/members')){if(method==='POST')members.push({user_id:data().userId,role:data().role});return respond(members);}
  if(path.endsWith('/activity'))return respond({counts:{unread:1,spam:0,drafts:0},unread:[],drafts:[],reminders:[]});
  if(path.endsWith('/stats'))return respond([{folder:'inbox',total:1,unread:1}]);
  if(path==='/api/mail/threads')return respond([{id:'thread1',subject:'Everything for your next project',from_email:'studio@example.invalid',text_body:'The brief and design notes are attached.',created_at:'2026-11-01T10:30:00Z',is_read:false,is_starred:false,message_count:1}]);
  if(path==='/api/mail/threads/thread1/ai'){assert.equal(data().acknowledgeExternalProcessing,true);aiCalls++;return respond({text:data().task==='summary'?'Synthetic summary only.':'Synthetic reply for review.'});}
  if(path==='/api/mail/threads/thread1')return respond([{id:'message1',direction:'inbound',status:'received',from_email:'studio@example.invalid',to_emails:['hello@example.invalid'],subject:'Everything for your next project',text_body:'Hi team,\n\nHere is everything for our next project. Please review the attached brief and share your thoughts.\n\nThank you,\nStudio team',created_at:'2026-11-01T10:30:00Z'}]);
  if(path.endsWith('/context'))return respond({sender:'studio@example.invalid',lead:null});
  if(path==='/api/mail/messages/message1/attachments')return respond(files);
  if(path==='/api/mail/attachments/file-pending/rescan'){rescanCalls++;files[1].scan_status='clean';return respond({ok:true});}
  return respond({error:'Unexpected fixture request: '+method+' '+path},404);
 });
 const shot=async name=>{if(output)await page.screenshot({path:resolve(output,name+'.png'),fullPage:!await page.locator('[role=dialog],[role=alertdialog]').count()});};
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Unexpected horizontal overflow');
 await page.goto(origin+'/dashboard/mail');await page.locator('.mail-empty-art').evaluate(image=>image.decode());assert.ok(await page.locator('.mail-empty-art').evaluate(image=>image.naturalWidth>0));await page.getByRole('button',{name:/Everything for your next project/}).click();
 await page.getByRole('button',{name:/3 attachments/}).click();
 const drawer=page.getByRole('dialog',{name:'Conversation files'});await drawer.waitFor();
 assert.equal(await drawer.getByRole('link',{name:'Download Project brief.pdf'}).count(),1);
 assert.equal(await drawer.getByRole('link',{name:'Download Design notes.txt'}).count(),0);
 assert.equal(await drawer.getByRole('link',{name:'Download Blocked file.zip'}).count(),0);
 await shot('glass-attachments-desktop');
 await page.setViewportSize({width:390,height:844});await noOverflow();await shot('glass-attachments-mobile');
 await drawer.getByRole('button',{name:'Retry scan for Design notes.txt'}).click();
 await drawer.getByRole('link',{name:'Download Design notes.txt'}).waitFor();assert.equal(rescanCalls,1);
 await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
 await page.getByRole('button',{name:/Compose/}).click();await page.getByLabel('Message',{exact:true}).fill('These changes must survive Cancel.');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('alertdialog').waitFor();await shot('glass-discard-mobile');
 await page.getByRole('button',{name:'Keep editing'}).click();
 assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'These changes must survive Cancel.');
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Discard changes'}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Summarize',exact:true}).click();
 await page.getByRole('alertdialog',{name:'Share an excerpt with AI?'}).waitFor();assert.equal(aiCalls,0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(aiCalls,0);
 await page.getByRole('button',{name:'Summarize',exact:true}).click();await page.getByRole('button',{name:'Share excerpt',exact:true}).click();
 await page.getByText('Synthetic summary only.',{exact:true}).waitFor();assert.equal(aiCalls,1);
 await page.getByRole('button',{name:'Draft a reply',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancel',exact:true}).press('Escape');assert.equal(aiCalls,1);
 await page.getByRole('button',{name:'Draft a reply',exact:true}).click();await page.getByRole('button',{name:'Share excerpt',exact:true}).click();
 await page.getByRole('dialog',{name:'New message'}).waitFor();assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'Synthetic reply for review.');assert.equal(aiCalls,2);
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();
 await page.goto(origin+'/dashboard/mail/admin');await page.getByRole('heading',{name:'Mail settings',exact:true}).waitFor();
 for(const width of [320,390,768,1440,2560]){await page.setViewportSize({width,height:900});await noOverflow();}
 await page.setViewportSize({width:1440,height:1000});await shot('glass-settings-desktop');
 await page.getByRole('button',{name:'New mailbox'}).click();await shot('glass-create-mailbox');
 await page.getByLabel('Choose domain').selectOption('domain1');await page.getByLabel('Mailbox username').fill('support');await page.getByLabel('Display name',{exact:true}).fill('Support team');
 await page.getByRole('button',{name:'Create mailbox',exact:true}).click();await page.getByRole('button',{name:/support@example.invalid/}).waitFor();assert.equal(createCalls,1);
 await page.getByRole('button',{name:/hello@example.invalid/}).click();
 const settings=page.getByRole('dialog',{name:'Mailbox settings',exact:true});await settings.getByLabel('Mailbox display name').waitFor();
 await settings.getByLabel('Mailbox display name').fill('Customer care');await settings.getByRole('button',{name:'Save name'}).click();
 await page.waitForFunction(()=>document.querySelector('input[aria-label="Mailbox display name"]')?.value==='Customer care');
 await settings.getByRole('button',{name:'Save name'}).waitFor({state:'visible'});
 // Wait until the request refresh has disabled the unchanged field action.
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Save name'))?.disabled);
 assert.equal(boxes[0].display_name,'Customer care');
 await settings.getByLabel('Alias name').fill('care');await settings.getByRole('button',{name:'Add alias'}).click();await settings.getByText('care@example.invalid',{exact:true}).waitFor();
 await settings.getByLabel('Supervisor ID').fill('synthetic-supervisor');await settings.getByLabel('Permission').selectOption('viewer');await settings.getByRole('button',{name:'Add member'}).click();await settings.getByText('synthetic-supervisor',{exact:false}).waitFor();assert.equal(members[0].role,'viewer');
 await shot('glass-mailbox-drawer');
 await settings.getByRole('switch',{name:'Mailbox enabled'}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(boxes[0].enabled,true);
 await settings.getByRole('switch',{name:'Mailbox enabled'}).click();await page.getByRole('button',{name:'Disable mailbox',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[role=switch]')?.getAttribute('aria-checked')==='false');assert.equal(boxes[0].enabled,false);
 await settings.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Use dark mode'}).click();await shot('glass-settings-dark');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/hello@example.invalid/}).click();await settings.getByLabel('Mailbox display name').waitFor();await noOverflow();await shot('glass-settings-mobile-dark');
 await settings.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'DNS setup'}).click();
 const dns=page.getByRole('dialog',{name:'Domain setup'});await dns.getByText('chatvice-verification=synthetic-only',{exact:true}).waitFor();await dns.getByRole('button',{name:'Verify DNS'}).click();await dns.getByRole('status').waitFor();assert.equal(verifyCalls,1);await noOverflow();
 await dns.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Add domain',exact:true}).click();await page.getByLabel('New mail domain').fill('second.example.invalid');await page.getByRole('dialog').getByRole('button',{name:'Add domain',exact:true}).click();await page.getByText('second.example.invalid',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: scoped composer discard/cancel, per-action AI consent/cancel without auto-send, attachment scan safety, mobile drawers, domain creation/verification, mailbox creation/name/status, aliases and viewer access; all data synthetic');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
