/** Actual browser form navigation must retain Origin for the strict login guard.
 * Loopback-only synthetic forms. No account, database or provider is accessed. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {renderQaLoginPage,QA_LOGIN_HEADERS} from '../server/mail/qa-login.ts';

async function listen(handler){
 const server=createServer(handler);
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
const observed=[];
let trustedOrigin;
const target=await listen((req,res)=>{
 if(req.url==='/login'){
  res.writeHead(200,{'Content-Type':'text/html',...QA_LOGIN_HEADERS});
  res.end(renderQaLoginPage());return;
 }
 if(req.url==='/qa/login'&&req.method==='POST'){
  observed.push(req.headers.origin);
  req.resume();
  if(req.headers.origin!==trustedOrigin){res.writeHead(403);res.end('Forbidden');return;}
  res.writeHead(303,{Location:'/done'});res.end();return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Form accepted</h1>');
});
trustedOrigin=target.origin;
const unrelated=await listen((_req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html'});
 res.end(`<form method="post" action="${target.origin}/qa/login"><button>Submit unrelated form</button></form>`);
});
let browser;
try{
 browser=await chromium.launch({headless:true,
  ...(process.env.CHATVICE_MAIL_BROWSER_PATH?{executablePath:process.env.CHATVICE_MAIL_BROWSER_PATH}:{})});
 const page=await browser.newPage();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.goto(target.origin+'/login');
  await page.getByLabel('Password',{exact:true}).fill('Synthetic-form-origin-only');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(target.origin+'/done');
  assert.equal(observed.at(-1),target.origin,
   'first-party form must provide its origin, not null');
 }
 await page.goto(unrelated.origin);
 const response=page.waitForResponse(r=>r.url()===target.origin+'/qa/login');
 await page.getByRole('button',{name:'Submit unrelated form'}).click();
 assert.equal((await response).status(),403,'unrelated origin must remain rejected');
 assert.notEqual(observed.at(-1),target.origin);
 console.log('PASS: QA browser login form retains Origin on desktop/mobile and rejects unrelated sites.');
}finally{
 await browser?.close();
 await Promise.all([target.server,unrelated.server].map(server=>new Promise(done=>server.close(done))));
}
