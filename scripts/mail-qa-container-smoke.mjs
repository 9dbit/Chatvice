/** Boots the actual Docker image against a fresh CI-only database. No provider
 * credentials, customer data or production service can be supplied to this test. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {hashMailPassword} from '../server/mail/password.ts';
const source=new URL(process.env.DATABASE_URL||'postgres://invalid/');
if(process.env.CHATVICE_MAIL_INTEGRATION_DB!=='isolated-ci'||
   !['127.0.0.1','localhost'].includes(source.hostname)||
   source.pathname!=='/chatvice_mail_ci'||!/^[a-f0-9]{12,64}$/.test(process.env.POSTGRES_CONTAINER||'')){
 throw new Error('Disposable CI container test guard denied execution');
}
const postgres=process.env.POSTGRES_CONTAINER;
const database='chatvice_mail_image_ci';
const image='chatvice-mail-qa:ci';
const container='chatvice-mail-image-'+randomBytes(6).toString('hex');
const port=await new Promise(done=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const value=s.address().port;s.close(()=>done(value));});});
source.pathname='/'+database;
const origin=`http://127.0.0.1:${port}`;
const loginPassword='Synthetic-container-login-'+randomBytes(12).toString('hex');
const env={...process.env,DATABASE_URL:source.toString(),PORT:String(port),
 CHATVICE_MAIL_QA_ROLE:'isolated-chatvice-mail',RAILWAY_ENVIRONMENT_NAME:'cutover-staging',
 CHATVICE_MAIL_QA_BOOTSTRAP:'true',CHATVICE_MAIL_QA_DB_KIND:'disposable-empty-only',
 CHATVICE_MAIL_ENABLED:'true',CHATVICE_MAIL_OUTBOUND_ENABLED:'false',CHATVICE_MAIL_AI_ENABLED:'false',
 CHATVICE_MAIL_ATTACHMENTS_ENABLED:'false',CHATVICE_MAIL_QA_SMOKE:'false',CHATVICE_MAIL_PROVIDER:'disabled',
 CHATVICE_MAIL_ALLOWED_ORIGINS:origin,CHATVICE_MAIL_QA_TOKEN:randomBytes(32).toString('hex'),
 CHATVICE_MAIL_QA_BASIC_PASSWORD_HASH:await hashMailPassword(loginPassword),
 CHATVICE_MAIL_ENCRYPTION_KEY:randomBytes(32).toString('hex')};
const settings=Object.keys(env).filter(k=>k.startsWith('CHATVICE_MAIL_')||['DATABASE_URL','PORT','RAILWAY_ENVIRONMENT_NAME'].includes(k)).flatMap(k=>['--env',k]);
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',env,timeout:120000,stdio:['ignore','pipe','pipe']});
let created=false;
try{
 const bytes=Number(docker(['image','inspect','--format','{{.Size}}',image]).trim());
 assert.ok(bytes>0&&bytes<350*1024*1024,`QA runtime image must be under 350 MiB; measured ${bytes} bytes`);
 docker(['exec',postgres,'createdb','-U','chatvice_mail',database]);created=true;
 docker(['run','--rm','--network','host',...settings,image,'node','scripts/mail-qa-bootstrap.mjs']);
 docker(['run','--detach','--rm','--network','host','--name',container,...settings,image]);
 let healthy=false;
 for(let attempt=0;attempt<60;attempt++){
  try{const r=await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)});if(r.ok){healthy=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,500));
 }
 assert.equal(healthy,true,'actual image must start against the disposable PostgreSQL');
 const call=(path,method='GET',data,authorized=true)=>fetch(origin+path,{method,
  headers:{Origin:origin,Accept:'application/json',...(authorized?{Authorization:'Bearer '+env.CHATVICE_MAIL_QA_TOKEN}:{}),...(data?{'Content-Type':'application/json'}:{})},
  body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(5000)});
 assert.equal((await call('/dashboard/mail','GET',undefined,false)).status,401);
 const redirect=await fetch(origin+'/dashboard/mail',{redirect:'manual',headers:{Accept:'text/html'}});
 assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/login');
 const loginPage=await fetch(origin+'/login');assert.equal(loginPage.status,200);
 assert.ok((await loginPage.text()).includes('/qa/login'));
 const login=await fetch(origin+'/qa/login',{method:'POST',redirect:'manual',
  headers:{Origin:origin.replace('http:','https:'),'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({username:'mailqa',password:loginPassword}).toString()});
 assert.equal(login.status,303);
 const cookie=login.headers.get('set-cookie');assert.match(cookie||'',/__Host-chatvice_mail_qa=.*Secure; SameSite=Strict/);
 const session=await fetch(origin+'/api/mail/mailboxes',{headers:{Cookie:cookie.split(';')[0]}});
 assert.equal(session.status,200);
 const document=await call('/dashboard/mail');assert.equal(document.status,200);
 assert.match(document.headers.get('cache-control')||'',/no-store/);
 const html=await document.text();assert.equal(/googletagmanager|google-analytics|fonts.googleapis.com/i.test(html),false);
 const asset=html.match(/src="([^\"]+\.js)"/);assert.ok(asset);assert.equal((await call(asset[1])).status,200);
 const boxes=await (await call('/api/mail/mailboxes')).json();assert.equal(boxes.length,1);
 const made=await call('/api/mail/compose','POST',{mailboxId:boxes[0].id,to:[],cc:['copy@example.invalid'],bcc:['hidden@example.invalid'],subject:'Image test draft',text:'Synthetic only',draft:true});
 assert.equal(made.status,201);
 const id=(await made.json()).id;
 const edited=await (await call(`/api/mail/drafts/${id}`)).json();
 assert.equal(edited.text,'Synthetic only');assert.deepEqual(edited.to,[]);assert.deepEqual(edited.bcc,['hidden@example.invalid']);
 assert.equal((await call(`/api/mail/drafts/${id}/send`,'POST',{})).status,503);
 docker(['exec',container,'node','-e',"const fs=require('node:fs');for(const p of ['/app/attached_assets','/app/client','/app/server'])if(fs.existsSync(p))throw new Error('Source assets must not be in runtime image');if(process.getuid()===0)throw new Error('Runtime must be non-root');"]);
 console.log(JSON.stringify({status:'passed',imageBytes:bytes,checks:['bootstrap','health','first-party-login-session','authenticated-ui-and-assets','anonymous-denied','encrypted-draft-cc-bcc','outbound-disabled','source-assets-excluded','non-root-runtime']}));
}catch(error){
 try{process.stderr.write(docker(['logs','--tail','30',container]));}catch{}
 throw error;
}finally{
 try{docker(['rm','--force',container]);}catch{}
 if(created)try{docker(['exec',postgres,'dropdb','-U','chatvice_mail',database]);}catch{}
}
