/** Exercise the deployable independent Mail image, offline identity provisioning
 * and persistent login against a fresh disposable CI database. No provider keys. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';

const source=new URL(process.env.DATABASE_URL||'postgres://invalid/');
if(process.env.CHATVICE_MAIL_INTEGRATION_DB!=='isolated-ci'||
   !['127.0.0.1','localhost'].includes(source.hostname)||source.pathname!=='/chatvice_mail_ci'||
   !/^[a-f0-9]{12,64}$/.test(process.env.POSTGRES_CONTAINER||''))
 throw new Error('Disposable independent Mail image test guard denied execution');
const postgres=process.env.POSTGRES_CONTAINER;
const database='chatvice_mail_app_image_ci';
const image='chatvice-mail-app:ci';
const container='chatvice-mail-app-image-'+randomBytes(6).toString('hex');
const port=await new Promise(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{
 const value=server.address().port;server.close(()=>done(value));
});});
source.pathname='/'+database;
const base=`http://127.0.0.1:${port}`;
const origin='https://mail-app-ci.example.invalid';
const email='owner@mail-app-ci.example.invalid';
const password='Synthetic-independent-login-'+randomBytes(12).toString('hex');
// Pass only explicitly declared fixture settings into the image; never inherit
// provider/storage credentials or another application's session configuration.
const fixture={DATABASE_URL:source.toString(),PORT:String(port),
 CHATVICE_MAIL_APP_ROLE:'isolated-mail',CHATVICE_MAIL_APP_ORIGIN:origin,
 CHATVICE_MAIL_ALLOWED_ORIGINS:origin,CHATVICE_MAIL_ENABLED:'true',
 CHATVICE_MAIL_AI_ENABLED:'false',CHATVICE_MAIL_OUTBOUND_ENABLED:'false',
 CHATVICE_MAIL_ATTACHMENTS_ENABLED:'false',CHATVICE_MAIL_QA_BOOTSTRAP:'false',
 CHATVICE_MAIL_SESSION_SECRET:randomBytes(32).toString('hex'),
 CHATVICE_MAIL_ENCRYPTION_KEY:randomBytes(32).toString('hex'),
 CHATVICE_MAIL_SCHEMA_INSTALL:'reviewed-isolated-only',
 CHATVICE_MAIL_SCHEMA_EXPECTED_HOST:source.hostname,CHATVICE_MAIL_INITIAL_TENANT:'mail_image_ci',
 MAIL_PROVISION_EXPECTED_HOST:source.hostname,MAIL_PROVISION_TENANT:'mail_image_ci',
 MAIL_PROVISION_USER:'mail_image_ci',MAIL_PROVISION_EMAIL:email,MAIL_PROVISION_ADMIN:'true'};
const env={...process.env,...fixture};
const settings=Object.keys(fixture).flatMap(key=>['--env',key]);
const docker=args=>execFileSync('docker',args,{encoding:'utf8',env,timeout:120000,
 maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});
const run=(command,overrides=[])=>docker(['run','--rm','--network','host',...settings,...overrides,image,...command]);
const inspectSchema=code=>run(['node','--input-type=module','-e',`import assert from 'node:assert/strict';import pg from 'pg';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});try{${code}}finally{await pool.end();}`]);
const call=(path,{method='GET',body,cookie,requestOrigin=origin}={})=>fetch(base+path,{
 method,redirect:'manual',headers:{Accept:'application/json',Origin:requestOrigin,
  ...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},
 body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});
async function waitHealthy(){
 for(let attempt=0;attempt<60;attempt++){
  try{if((await call('/health')).ok)return;}catch{}
  await new Promise(done=>setTimeout(done,500));
 }
 throw new Error('Independent Mail image did not become healthy');
}
let created=false;
try{
 const bytes=Number(docker(['image','inspect','--format','{{.Size}}',image]).trim());
 assert.ok(bytes>0&&bytes<350*1024*1024,'Independent runtime must remain below 350 MiB');
 docker(['exec',postgres,'createdb','-U','chatvice_mail',database]);created=true;
 let refused=false;
 try{run(['node','scripts/mail-app-schema.mjs'],['--env','CHATVICE_MAIL_SCHEMA_EXPECTED_HOST=wrong.example.invalid']);}
 catch(error){refused=String(error.stderr).includes('Isolated Mail schema guard denied');}
 assert.equal(refused,true,'wrong database host must be refused before installation');
 run(['node','scripts/mail-app-schema.mjs']);
 inspectSchema(`assert.equal((await pool.query('SELECT count(*)::integer AS n FROM mail_schema_migrations')).rows[0].n,4);
  await pool.query("DELETE FROM mail_schema_migrations WHERE name='20261027_chatvice_mail_delivery_recipients_v3.sql'");
  await pool.query('ALTER TABLE mail_delivery_events DROP COLUMN recipient_keys');
  await pool.query("UPDATE mail_schema_migrations SET sha256=$1 WHERE name='20261026_chatvice_mail_v1.sql'",['0'.repeat(64)]);`);
 let historyRefused=false;
 try{run(['node','scripts/mail-app-schema.mjs']);}catch{historyRefused=true;}
 assert.equal(historyRefused,true,'the packaged installer must refuse an edited prior migration history');
 inspectSchema(`assert.equal((await pool.query("SELECT count(*)::integer AS n FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'")).rows[0].n,0);
  assert.equal((await pool.query('SELECT count(*)::integer AS n FROM mail_schema_migrations')).rows[0].n,3);
  const sha=createHash('sha256').update(readFileSync('migrations/20261026_chatvice_mail_v1.sql','utf8')).digest('hex');
  await pool.query("UPDATE mail_schema_migrations SET sha256=$1 WHERE name='20261026_chatvice_mail_v1.sql'",[sha]);`);
 run(['node','scripts/mail-app-schema.mjs']); // exact previous release upgrades inside the packaged runtime
 inspectSchema(`assert.equal((await pool.query('SELECT count(*)::integer AS n FROM mail_schema_migrations')).rows[0].n,4);
  const result=await pool.query("SELECT udt_name,is_nullable FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'");
  assert.deepEqual(result.rows,[{udt_name:'_text',is_nullable:'NO'}]);`);
 run(['node','scripts/mail-app-schema.mjs']); // verifies packaged migration history on repeat
 const preview=JSON.parse(run(['node','dist/mail-provision-user.mjs']).trim());
 assert.equal(preview.preview,true);assert.equal(preview.valid,true);
 docker(['run','--detach','--rm','--network','host','--name',container,...settings,image]);
 await waitHealthy();
 assert.equal((await call('/api/mail-auth/session')).status,401);
 assert.equal((await call('/api/mail/mailboxes',{cookie:'connect.sid=synthetic-main-app-only'})).status,401);
 assert.equal((await call('/api/mail-auth/login',{method:'POST',body:{email,password}})).status,401,
  'provisioning preview must not create an identity');
 const document=await call('/dashboard/mail');assert.equal(document.status,200);
 assert.equal(/no-store/.test(document.headers.get('cache-control')||''),true);
 assert.equal((document.headers.get('content-security-policy')||'').includes("frame-ancestors 'none'"),true);
 const html=await document.text();
 assert.equal(/googletagmanager|google-analytics|fonts.googleapis.com/i.test(html),false);
 const asset=html.match(/src="([^\"]+\.js)"/);assert.ok(asset);
 assert.equal((await call(asset[1])).status,200);
 env.MAIL_PROVISION_PASSWORD=password;
 const provisioned=JSON.parse(run(['node','dist/mail-provision-user.mjs','--apply'],['--env','MAIL_PROVISION_PASSWORD']).trim());
 delete env.MAIL_PROVISION_PASSWORD;
 assert.equal(provisioned.created,true);
 assert.equal((await call('/api/mail-auth/login',{method:'POST',body:{email,password},
  requestOrigin:'https://unrelated.example.invalid'})).status,403);
 const login=await call('/api/mail-auth/login',{method:'POST',body:{email,password}});
 assert.equal(login.status,200);
 const rawCookie=login.headers.get('set-cookie')||'';
 // Never include a session token in assertion output.
 assert.equal(/^__Host-chatvice_mail=[a-f0-9]{64};/.test(rawCookie)&&
  ['Path=/','Secure','HttpOnly','SameSite=Strict'].every(flag=>rawCookie.includes(flag)),true);
 const cookie=rawCookie.split(';')[0];
 const session=await call('/api/mail-auth/session',{cookie});assert.equal(session.status,200);
 assert.deepEqual(await session.json(),{authenticated:true,email,admin:true});
 const boxes=await call('/api/mail/mailboxes',{cookie});assert.equal(boxes.status,200);
 assert.deepEqual(await boxes.json(),[]);
 const capabilities=await call('/api/mail/capabilities',{cookie});assert.equal(capabilities.status,200);
 const flags=await capabilities.json();assert.equal(flags.admin,true);
 assert.equal(flags.outbound,false);assert.equal(flags.ai,false);assert.equal(flags.attachments,false);
 docker(['restart',container]);await waitHealthy();
 assert.equal((await call('/api/mail-auth/session',{cookie})).status,200,
  'session must remain valid across runtime restart with the same stable secrets');
 assert.equal((await call('/api/mail-auth/logout',{method:'POST',cookie})).status,200);
 assert.equal((await call('/api/mail-auth/session',{cookie})).status,401,
  'logout must revoke the persistent server-side session');
 docker(['exec',container,'node','-e',"const fs=require('node:fs');for(const p of ['/app/attached_assets','/app/client','/app/server','/app/dist/mail-qa-server.cjs','/app/scripts/mail-qa-bootstrap.mjs'])if(fs.existsSync(p))throw new Error('Unexpected source or QA runtime');if(process.getuid()===0)throw new Error('Runtime must be non-root');"]);
 console.log(JSON.stringify({status:'passed',imageBytes:bytes,checks:[
  'guarded-packaged-schema','packaged-three-to-four-migration-upgrade','edited-history-refused-without-schema-change','immutable-history-repeat','provision-preview-no-write','compiled-offline-provisioning',
  'health','tracker-free-ui-assets','main-app-cookie-denied','cross-origin-login-denied',
  'independent-secure-session','persistent-session-after-restart','logout-revokes-session',
  'provider-features-disabled','qa-and-source-excluded','non-root-runtime']}));
}catch(error){
 try{process.stderr.write(docker(['logs','--tail','20',container]));}catch{}
 throw error;
}finally{
 delete env.MAIL_PROVISION_PASSWORD;
 try{docker(['rm','--force',container]);}catch{}
 if(created)try{docker(['exec',postgres,'dropdb','-U','chatvice_mail',database]);}catch{}
}
