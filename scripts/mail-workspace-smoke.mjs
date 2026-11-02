// Synthetic browser contract test. Never connects to a database or provider.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import express from 'express';
import { chromium } from '@playwright/test';
import { tsImport } from 'tsx/esm/api';

// Use the real server-side converter. The API fixture deliberately exposes only
// its plain-text result, matching the reader endpoint's private field contract.
const {readableMailText}=await tsImport('../server/mail/message-text.ts',import.meta.url);
const htmlOnlyBody=`<!doctype html><html><head><style>@font-face{font-family:tracking;src:url(https://mail-tracker.example.invalid/font)}p{background:url(https://mail-tracker.example.invalid/background)}</style><link rel="stylesheet" href="https://mail-tracker.example.invalid/style.css"></head><body><p>Hello &amp; welcome &#x1f642;.</p><p>Second paragraph.<br>Next line with &lt;strong&gt;literal markup&lt;/strong&gt;.</p><p><a href="https://mail-tracker.example.invalid/link">Read project details</a></p><script>window.__mailHtmlExecuted=true;fetch('https://mail-tracker.example.invalid/script')</script><img src="https://mail-tracker.example.invalid/pixel" onerror="window.__mailHtmlExecuted=true"><iframe src="https://mail-tracker.example.invalid/frame"></iframe></body></html>`;
const confirmUrl='https://auth.example.invalid/verify?token=synthetic%2Bonly&type=signup&redirect_to=https%3A%2F%2Fshop.example.invalid%2F';
const htmlOnlyText=readableMailText('',htmlOnlyBody);

const app=express();
app.use('/assets',express.static(resolve('dist/mail-qa/assets')));
app.get('/dashboard/mail',(_req,res)=>res.sendFile(resolve('dist/mail-qa/mail-qa.html')));
const server=await new Promise(done=>{const s=app.listen(0,'127.0.0.1',()=>done(s));});
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const output=process.env.CHATVICE_MAIL_SMOKE_OUTPUT;
if(output)await mkdir(output,{recursive:true});
const screen=async(page,name)=>{if(output)await page.screenshot({path:resolve(output,`${name}.png`),fullPage:true});};
const box='00000000-0000-4000-8000-000000000001';
const otherBox='00000000-0000-4000-8000-000000000002';
const thread='00000000-0000-4000-8000-000000000011';
const thread2='00000000-0000-4000-8000-000000000012';
const message='00000000-0000-4000-8000-000000000021';
const base={id:thread,subject:'A new space for better conversations',from_email:'amelia@example.invalid',text_body:'Hi team, could you share the details for our next project?',created_at:'2026-10-27T08:30:00Z',is_read:false,is_starred:false,message_count:2};
const wait=ms=>new Promise(done=>setTimeout(done,ms));
try{
 browser=await chromium.launch({headless:true,...(process.env.CHATVICE_MAIL_BROWSER_PATH?{executablePath:process.env.CHATVICE_MAIL_BROWSER_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const openMenu=async()=>{const button=page.getByRole('button',{name:'Open mail menu'});if(await button.count())await button.click();};
 const closeMenu=async()=>{const drawer=page.getByRole('dialog',{name:'Workspace menu_'});if(await drawer.count())await drawer.getByRole('button',{name:'Close',exact:true}).click();};
 page.setDefaultTimeout(15000);
 page.setDefaultNavigationTimeout(15000);
 let viewer=false,folder='inbox',read=false,starred=false,draft=null,patches=0,composeCalls=0;
 let sendingAvailable=false,queueCalls=0;
 let delayThread=false,delayCompose=false;
 const errors=[];
 const trackingRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(new URL(request.url()).hostname==='mail-tracker.example.invalid')trackingRequests.push(request.url());});
 await page.route('https://mail-tracker.example.invalid/**',route=>route.abort());
 await page.route('**/api/mail/**',async route=>{
  const url=new URL(route.request().url());
  const method=route.request().method(),path=url.pathname;
  const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/mail/capabilities')return fulfill({admin:!viewer,outbound:sendingAvailable,ai:false,attachments:false});
  if(path==='/api/mail/mailboxes')return fulfill([{id:box,local_part:'hello',domain:'studio.example.invalid',display_name:'Studio',enabled:true,can_write:!viewer,aliases:['sales@studio.example.invalid']},{id:otherBox,local_part:'team',domain:'studio.example.invalid',display_name:'Team',enabled:true,can_write:!viewer,aliases:[]}]);
  if(path.endsWith('/activity'))return fulfill({counts:{unread:1,spam:0,drafts:0},unread:[],drafts:[],reminders:[]});
  if(path.endsWith('/stats'))return fulfill([{folder,total:2,unread:read?0:1},{folder:'drafts',total:draft?1:0,unread:0}]);
  if(path==='/api/mail/threads'){
   const activeFolder=url.searchParams.get('folder'),filter=url.searchParams.get('filter');
   if(activeFolder==='drafts')return fulfill(draft?[{...base,id:thread2,subject:draft.subject,text_body:draft.text,is_read:true}]:[]);
   if(activeFolder!==folder||filter==='unread'&&read||filter==='starred'&&!starred)return fulfill([]);
   const offset=Number(url.searchParams.get('offset'));
   if(offset>=80)return fulfill([{...base,id:'third-page',subject:'Third page conversation',is_read:true}]);
   if(offset>=40)return fulfill([{...base,id:thread2,subject:'Second page conversation',is_read:true},
    ...Array.from({length:40},(_,i)=>({...base,id:`second-fixture-${i}`,subject:`Second page update ${i+1}`,is_read:true}))]);
   return fulfill([{...base,is_read:read,is_starred:starred},...Array.from({length:40},(_,i)=>({...base,id:`fixture-${i}`,subject:`Project update ${i+1}`,from_email:`contact${i+1}@example.invalid`,is_read:true,message_count:1}))]);
  }
  if(path===`/api/mail/threads/${thread}`&&method==='PATCH'){
   patches++;const change=route.request().postDataJSON();
   assert.equal(change.mailboxId,box);assert.equal(change.sourceFolder,folder);
   if(change.folder)folder=change.folder;
   if(change.isRead!==undefined)read=change.isRead;
   if(change.isStarred!==undefined)starred=change.isStarred;
   return fulfill({updated:2});
  }
  if(path.endsWith('/context'))return fulfill({sender:'amelia@example.invalid',lead:null});
  if(path===`/api/mail/threads/${thread}`){
   if(delayThread)await wait(350);
   return fulfill([{id:message,direction:'inbound',status:'received',from_email:base.from_email,to_emails:['hello@studio.example.invalid','sales@studio.example.invalid','partner@example.invalid'],cc_emails:['reviewer@example.invalid','partner@example.invalid'],subject:base.subject,text_body:`Hi team,\n\nCould you share the details for our next project?\n\n<img src=x onerror=alert(1)>\n\nThank you,\nAmelia\n\nConfirm email address [${confirmUrl}]`,created_at:base.created_at,is_read:read,is_starred:starred},
    {id:'html-only-message',direction:'inbound',status:'received',from_email:base.from_email,to_emails:['hello@studio.example.invalid','sales@studio.example.invalid','partner@example.invalid'],cc_emails:['reviewer@example.invalid','partner@example.invalid'],subject:base.subject,text_body:htmlOnlyText,created_at:base.created_at,is_read:read,is_starred:starred}]);
  }
  if(path===`/api/mail/threads/${thread2}`)return fulfill([{id:'draft-message',status:'draft',direction:'outbound',from_email:'hello@studio.example.invalid',to_emails:draft?.to||[],subject:draft?.subject||'',text_body:draft?.text||'',created_at:base.created_at,is_read:true,is_starred:false}]);
  if(path==='/api/mail/compose'){
   if(delayCompose)await wait(350);
   composeCalls++;draft=route.request().postDataJSON();assert.equal(draft.draft,true);
   return fulfill({id:'draft-message',status:'draft'},201);
  }
  if(path==='/api/mail/drafts/draft-message'&&method==='PATCH'){draft=route.request().postDataJSON();return fulfill({id:'draft-message',status:'draft'});}
  if(path==='/api/mail/drafts/draft-message'&&method==='GET')return fulfill({id:'draft-message',mailboxId:box,to:draft?.to||[],cc:draft?.cc||[],bcc:draft?.bcc||[],subject:draft?.subject||'',text:draft?.text||''});
  if(path==='/api/mail/drafts/draft-message/send'&&method==='POST'){
   queueCalls++;return queueCalls===1?fulfill({error:'Temporary provider failure'},503):fulfill({id:'draft-message',status:'queued'});
  }
  return fulfill({error:'Unexpected test request: '+path},404);
 });
 await page.goto(origin+'/dashboard/mail');
 await page.getByRole('button',{name:'Compose',exact:false}).waitFor();
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).waitFor();
 assert.ok((await page.locator('.mail-workspace').boundingBox()).height<=1000,'desktop inbox must stay within a bounded workspace');
 assert.ok(await page.locator('.mail-thread-scroll').evaluate(el=>el.scrollHeight>el.clientHeight),'long inboxes must scroll within their panel');

 // Desktop has a persistent icon rail; scrolling only changes the header.
 assert.equal(await page.locator('.mail-desktop-activity').count(),1);
 assert.equal(await page.getByRole('navigation',{name:'Mail folders'}).count(),1);
 assert.equal(Math.round((await page.locator('.mail-desktop-sidebar').boundingBox()).x),Math.round((await page.locator('.mail-workspace').boundingBox()).x));
 const normalHeader=(await page.locator('.mail-topbar').boundingBox()).height;
 await page.locator('.mail-thread-scroll').evaluate(el=>el.scrollTop=250);
 await page.waitForFunction(()=>document.querySelector('.mail-topbar-compact'));
 assert.ok((await page.locator('.mail-topbar').boundingBox()).height<normalHeader);
 await page.locator('.mail-thread-scroll').evaluate(el=>el.scrollTop=0);
 await page.waitForFunction(()=>!document.querySelector('.mail-topbar-compact'));
 assert.equal((await page.locator('.mail-topbar').boundingBox()).height,normalHeader);
 const filterBox=await page.getByRole('button',{name:'Unread',exact:true}).boundingBox(),refreshBox=await page.getByRole('button',{name:'Refresh mailbox'}).boundingBox();
 assert.ok(Math.abs(filterBox.y-refreshBox.y)<2,'filters and refresh share a row');
 const composeBox=await page.getByRole('button',{name:'Compose',exact:false}).boundingBox();
 assert.ok(composeBox.y>normalHeader+300&&composeBox.x>1200&&composeBox.height>=48,'compose floats at bottom-right');
 const titleBox=await page.getByRole('heading',{name:'Inbox',exact:true}).boundingBox();
 assert.ok(Math.abs((titleBox.y+titleBox.height/2)-(filterBox.y+filterBox.height/2))<8,'Inbox heading, filters, search and refresh share one row');
 const avatar=await page.locator('.mail-thread-avatar').first().boundingBox();
 assert.ok(avatar.width>=54&&avatar.height>=54,'sender avatar is a large circle');
 assert.equal(await page.locator('.mail-thread-avatar').first().evaluate(el=>getComputedStyle(el).borderRadius),'50%');
 assert.equal(await page.locator('.mail-workspace-notice').filter({hasText:'Inbox'}).count(),0,'remove redundant Inbox conversations header');
 await page.getByRole('button',{name:'Star email from amelia@example.invalid',exact:true}).click();
 await page.getByRole('button',{name:'Unstar email from amelia@example.invalid',exact:true}).waitFor();
 assert.equal(await page.locator('.mail-conversation-heading').count(),0,'starred list action must not select a thread');
 await page.getByRole('button',{name:'Unstar email from amelia@example.invalid',exact:true}).click();
 await page.getByRole('button',{name:'Star email from amelia@example.invalid',exact:true}).waitFor();
 await page.getByRole('button',{name:'Search conversations',exact:true}).click();
 await page.getByLabel('Search this page').fill('nothing-matches');
 await page.getByLabel('Search this page').press('Escape');
 assert.equal(await page.getByLabel('Search this page').count(),0);
 assert.equal(await page.getByRole('button',{name:'Search conversations',exact:true}).evaluate(el=>el===document.activeElement),true);
 assert.equal(await page.getByLabel('Search filter active').count(),1);
 await page.keyboard.press('/');await page.getByLabel('Search this page').fill('');await page.getByLabel('Search this page').press('Escape');
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
 assert.equal(Math.round((await page.locator('.mail-desktop-sidebar').boundingBox()).width),64);
 assert.equal(await page.getByRole('navigation',{name:'Mail folders'}).getByRole('button',{name:'Inbox',exact:true}).isVisible(),true);
 await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();
 assert.ok((await page.locator('.mail-desktop-sidebar').boundingBox()).width>190);
 await screen(page,'mail-desktop');
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).click();
 await page.getByRole('heading',{name:'amelia@example.invalid',exact:true}).first().waitFor();
 assert.equal(await page.locator('.mail-message-body img').count(),0);
 const confirmation=page.locator('.mail-message-body').first().getByRole('link');
 assert.equal(await confirmation.getAttribute('href'),confirmUrl);
 // Only synthetic confirmation URLs are clicked; no real token is consumed.
 await page.context().route('https://auth.example.invalid/**',route=>route.fulfill({status:200,contentType:'text/html',body:'Synthetic confirmation destination'}));
 const popupPromise=page.waitForEvent('popup');
 await confirmation.click();
 const popup=await popupPromise;await popup.waitForURL(confirmUrl,{waitUntil:'domcontentloaded'});
 assert.equal(popup.url(),confirmUrl);await popup.close();

 assert.ok(await page.locator('.mail-message-body').first().innerText().then(t=>t.includes('<img')));
 assert.equal(await page.locator('.mail-message-body').nth(1).innerText(),'Hello & welcome 🙂.\n\nSecond paragraph.\nNext line with <strong>literal markup</strong>.\n\nRead project details [https://mail-tracker.example.invalid/link]');
 assert.equal(await page.locator('.mail-message-body script,.mail-message-body iframe,.mail-message-body style,.mail-message-body strong').count(),0);
 const safeLink=page.locator('.mail-message-body').nth(1).getByRole('link');
 assert.equal(await safeLink.getAttribute('href'),'https://mail-tracker.example.invalid/link');
 assert.equal(await safeLink.getAttribute('target'),'_blank');
 assert.equal(await safeLink.getAttribute('rel'),'noopener noreferrer');
 assert.equal(await safeLink.getAttribute('referrerpolicy'),'no-referrer');
 assert.equal(await page.evaluate(()=>window.__mailHtmlExecuted),undefined);
 assert.deepEqual(trackingRequests,[],'HTML-only text must not load pixels, fonts, styles or frames');

 await page.locator('.mail-reader-content').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.waitForFunction(()=>document.querySelector('.mail-topbar-compact'));
 await page.locator('.mail-reader-content').evaluate(el=>el.scrollTop=0);
 await page.waitForFunction(()=>!document.querySelector('.mail-topbar-compact'));
 await screen(page,'mail-conversation');
 await page.getByRole('button',{name:'Reply all',exact:true}).click();
 assert.equal(await page.getByLabel('Recipients',{exact:true}).inputValue(),'amelia@example.invalid, partner@example.invalid');
 assert.equal(await page.getByLabel('CC recipients',{exact:true}).inputValue(),'reviewer@example.invalid');
 assert.equal(await page.getByLabel('BCC recipients',{exact:true}).inputValue(),'');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(composeCalls,1,'closing a reply auto-creates one private draft');
 assert.deepEqual(draft.to,['amelia@example.invalid','partner@example.invalid']);
 await page.getByRole('button',{name:'Star conversation',exact:true}).click();
 await page.getByRole('button',{name:'Remove star',exact:true}).waitFor();
 await page.getByRole('button',{name:'Mark read',exact:true}).click();
 await page.getByRole('button',{name:'Mark unread',exact:true}).waitFor();
 await page.getByRole('button',{name:'Archive conversation',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Conversation moved to archive'}).waitFor();
 await openMenu();
 await page.getByRole('button',{name:/^Archive/}).click();
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).click();
 await page.getByRole('button',{name:'Move to inbox',exact:true}).click();
 await openMenu();
 await page.getByRole('navigation',{name:'Mail folders'}).getByRole('button',{name:/^Inbox/}).click();
 const starredResponse=page.waitForResponse(response=>{
  const u=new URL(response.url());return u.pathname==='/api/mail/threads'&&u.searchParams.get('filter')==='starred';
 });
 await page.getByRole('button',{name:'Starred',exact:true}).click();
 await starredResponse;
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).waitFor();
 await page.getByRole('button',{name:'All',exact:true}).click();
 assert.equal((await page.locator('.mail-pagination-buttons').innerText()).trim().replace(/\\s+/g,' '),'1','first page only shows current number with next arrow');
 assert.equal(await page.getByRole('button',{name:'Previous page'}).count(),0);
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await page.getByRole('button',{name:'Second page conversation',exact:false}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Previous page',exact:true}).innerText(),'1','second page shows 1 2 >');
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await page.getByRole('button',{name:'Third page conversation',exact:false}).waitFor();
 assert.equal(await page.locator('.mail-page-current').innerText(),'3');
 assert.equal(await page.getByRole('button',{name:'Previous page',exact:true}).locator('svg').count(),1,'third page shows a back chevron');
 await page.getByRole('button',{name:'Previous page',exact:true}).click();
 await page.getByRole('button',{name:'Second page conversation',exact:false}).waitFor();
 await page.getByRole('button',{name:'Previous page',exact:true}).click();
 await page.getByRole('button',{name:'Search conversations',exact:true}).click();
 await page.getByLabel('Search this page').fill('nothing-matches');
 await page.getByText('No matches on this page',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Clear search',exact:true}).first().click();
 await page.getByRole('button',{name:'Compose',exact:false}).click();
 await page.getByLabel('Subject',{exact:true}).fill('Project follow-up');
 await page.getByLabel('Message',{exact:true}).fill('Thank you for getting in touch.');
 await page.getByRole('button',{name:'CC / BCC',exact:true}).click();
 await page.getByLabel('CC recipients',{exact:true}).fill('reviewer@example.invalid');
 await page.getByLabel('BCC recipients',{exact:true}).fill('hidden@example.invalid');
 assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).isDisabled(),true);
 await screen(page,'mail-compose');
 delayCompose=true;
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await page.getByText('Draft saved privately',{exact:true}).waitFor();
 assert.equal(composeCalls,2);
 assert.deepEqual(draft.to,[],'a draft must save before a To recipient exists');
 assert.deepEqual(draft.cc,['reviewer@example.invalid']);assert.deepEqual(draft.bcc,['hidden@example.invalid']);
 await page.getByLabel('Recipients',{exact:true}).fill('client@example.invalid');
 await page.getByLabel('Message',{exact:true}).fill('An unsaved change');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(await page.getByRole('alertdialog').count(),0,'close must save rather than ask to discard');
 assert.equal(composeCalls,2,'closing an existing draft must update it without duplication');
 assert.equal(draft.text,'An unsaved change');
 assert.deepEqual(draft.to,['client@example.invalid'],'closing saved the recipient edits');
 await openMenu();
 await page.getByRole('button',{name:/^Drafts/}).click();
 await page.getByRole('button',{name:'Project follow-up',exact:false}).click();
 await page.getByRole('button',{name:'Continue editing',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'An unsaved change');
 assert.equal(await page.getByLabel('CC recipients',{exact:true}).inputValue(),'reviewer@example.invalid');
 assert.equal(await page.getByLabel('BCC recipients',{exact:true}).inputValue(),'hidden@example.invalid');
 await page.getByLabel('Message',{exact:true}).fill('Final draft saved with Escape.');
 await page.keyboard.press('Escape');
 await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(draft.text,'Final draft saved with Escape.','Escape also saves instead of discarding edits');
 await openMenu();
 await page.getByRole('navigation',{name:'Mail folders'}).getByRole('button',{name:/^Inbox/}).click();
 await page.setViewportSize({width:390,height:844});
 await page.locator('.mail-mobile-activity').waitFor();
 assert.equal(await page.locator('.mail-desktop-activity').count(),0);
 assert.ok((await page.locator('.mail-mobile-activity .mail-ticker').boundingBox()).x<18,'mobile running ticker is left aligned in footer');
 assert.ok(await page.locator('.mail-mobile-activity .mail-ticker').isVisible(),'mobile footer shows running activity text or empty-state text');
 assert.equal(await page.getByRole('button',{name:'Open mail menu',exact:true}).innerText(),'','hamburger has no Menu label');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openMenu();
 assert.match(await page.locator('.mail-menu-drawer').evaluate(el=>getComputedStyle(el).animationName),/mailMenuSlideIn/,'drawer uses smooth open animation');
 await closeMenu();
 await page.emulateMedia({reducedMotion:'reduce'});
 await screen(page,'mail-mobile-inbox');
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).click();
 await page.getByRole('heading',{name:'amelia@example.invalid',exact:true}).first().waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile must not overflow horizontally');
 assert.equal(await page.locator('.mail-message-body').first().getByRole('link').getAttribute('href'),confirmUrl);
 await screen(page,'mail-mobile-conversation');
 await page.getByRole('button',{name:'Back to messages',exact:true}).click();
 delayThread=true;
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).click();
 await page.getByRole('button',{name:'Back to messages',exact:true}).click();
 await openMenu();
 await page.getByRole('combobox',{name:'WORKSPACE'}).selectOption(otherBox);
 await wait(500);
 assert.equal(await page.locator('.mail-message-body').count(),0,'old mailbox responses must not repopulate the reader');
 viewer=true;
 await page.reload();
 await openMenu();
 await page.getByText('Read-only access',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Compose',exact:false}).isDisabled(),true);
 assert.equal(await page.getByRole('link',{name:'Mail settings'}).count(),0);
 await page.getByRole('button',{name:'A new space for better conversations',exact:false}).click();
 await page.getByRole('heading',{name:'amelia@example.invalid',exact:true}).first().waitFor();
 assert.equal(await page.getByRole('button',{name:'Remove star',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:/^Reply to/}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Add to CRM',exact:true}).count(),0);
 viewer=false;sendingAvailable=true;
 await page.reload();
 await page.getByRole('button',{name:'Compose',exact:false}).click();
 await page.getByLabel('Recipients',{exact:true}).fill('client@example.invalid');
 await page.getByLabel('Subject',{exact:true}).fill('Queue retry');
 await page.getByLabel('Message',{exact:true}).fill('No duplicate outbound message.');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Temporary provider failure'}).waitFor();
 assert.equal(composeCalls,3);
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Message queued.'}).waitFor();
 assert.equal(composeCalls,3,'a queue retry must retain its saved draft ID');assert.equal(queueCalls,2);
 assert.equal(patches,6);
 assert.deepEqual(errors,[]);
 assert.deepEqual(trackingRequests,[]);
 console.log('PASS: browser workspace contracts (navigation, filters, pagination, archive/restore, star/read, recipient-free drafts, CC/BCC persistence, X/Escape autosave, reply-all, queue retry without duplication, failed-safe edits, disabled sending, mobile, stale response isolation, read-only access, HTML-only text without tracking or script execution, safe rendering). Synthetic data only.');
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}


