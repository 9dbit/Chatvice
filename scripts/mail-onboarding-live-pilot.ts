import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {pool} from '../server/db';
import {createStandaloneMailbox,OnboardingError} from '../server/mail/onboarding';

// One-shot, explicitly scoped production smoke test. Never reset an existing login.
const tenant='chatvice-mail',local='onboarding-qa-20261105',address=local+'@chatvice.app';
const origin='https://mail.chatvice.app',target='9dragons.project@gmail.com';
const marker='CHATVICE-ONBOARDING-E2E-20261105';
const attachmentText=marker+'\nSynthetic attachment round-trip verification.\n';
let box='',login='',cookie='',phase='configuration';
const log=(check:string,data:Record<string,unknown>={})=>console.log(JSON.stringify({pilot:marker,check,...data}));
const pause=()=>new Promise(r=>setTimeout(r,5000));
async function request(path:string,method='GET',body?:unknown,expected=200){
  const headers:Record<string,string>={Origin:origin};if(cookie)headers.Cookie=cookie;
  if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
  const r=await fetch(origin+path,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(60000),redirect:'error'});
  assert.equal(r.status,expected,phase+' unexpected HTTP '+r.status);
  return r;
}
async function json(path:string,method='GET',body?:unknown,expected=200){return (await request(path,method,body,expected)).json();}
async function until<T>(fn:()=>Promise<T|false>,ms=300000):Promise<T>{const end=Date.now()+ms;while(Date.now()<end){const v=await fn();if(v!==false)return v;await pause();}throw new Error(phase+' timed out');}
async function uploadAndSend(subject:string,text:string,replyToId?:string){
  const d=await json('/api/mail/compose','POST',{mailboxId:box,to:[target],subject,text,draft:true,...(replyToId?{replyToId}:{})},201);
  const form=new FormData();form.append('file',new Blob([attachmentText],{type:'text/plain'}),'chatvice-onboarding-proof.txt');
  const a=await json('/api/mail/messages/'+d.id+'/attachments','POST',form,201);
  assert.equal(a.scanStatus,'clean');
  assert.equal(await (await request('/api/mail/attachments/'+a.id+'/download')).text(),attachmentText);
  await json('/api/mail/drafts/'+d.id+'/send','POST',{});
  await until(async()=>{const q=await pool.query('SELECT status FROM mail_messages WHERE id=$1 AND mailbox_id=$2',[d.id,box]);if(q.rows[0]?.status==='failed')throw new Error('outbox failed');return q.rows[0]?.status==='sent';});
  return d;
}
async function run(){
  assert.equal(process.env.CHATVICE_MAIL_LIVE_PILOT,'20261105-approved');
  assert.equal(process.env.CHATVICE_MAIL_APP_ORIGIN,origin);
  assert.equal(process.env.CHATVICE_MAIL_ONBOARDING_ENABLED,'true');
  const db=new URL(process.env.DATABASE_URL!);assert.equal(db.hostname,process.env.CHATVICE_MAIL_SCHEMA_EXPECTED_HOST);
  const before=await pool.query('SELECT id,enabled,credential_version,password_hash FROM mail_login_users ORDER BY id');
  phase='creation';
  const domain=await pool.query("SELECT id FROM mail_domains WHERE tenant_id=$1 AND domain='chatvice.app' AND status='verified'",[tenant]);assert.equal(domain.rowCount,1);
  const created=await createStandaloneMailbox(tenant,{domainId:domain.rows[0].id,localPart:local,displayName:'Onboarding QA 20261105'});
  box=created.id;
  const p=await pool.query('SELECT login_id FROM mail_mailbox_provisioning WHERE mailbox_id=$1 AND tenant_id=$2',[box,tenant]);login=p.rows[0].login_id;
  log('created',{address,mailboxId:box});
  await assert.rejects(()=>createStandaloneMailbox(tenant,{domainId:domain.rows[0].id,localPart:local}),e=>e instanceof OnboardingError&&e.status===409);
  phase='activation';const token=created.activationUrl.split('#token=')[1],password=randomBytes(32).toString('base64url');
  await json('/api/mail-auth/login','POST',{email:address,password},401);
  await json('/api/mail-auth/activate','POST',{token,password});
  await json('/api/mail-auth/activate','POST',{token,password},410);
  phase='login';const auth=await request('/api/mail-auth/login','POST',{email:address,password});
  const identity=await auth.json();assert.equal(identity.authenticated,true);assert.equal(identity.admin,false);
  cookie=(auth.headers.get('set-cookie')||'').split(';')[0];assert.match(cookie,/^__Host-chatvice_mail=/);
  const boxes=await json('/api/mail/mailboxes');assert.equal(boxes.length,1);assert.equal(boxes[0].id,box);
  await request('/api/mail/domains','GET',undefined,403);
  await request('/api/mail/threads?mailboxId=e681c6fa-a9f2-4a4d-bf3b-4fc4f03347c4','GET',undefined,403);
  await request('/api/mail/onboarding/status','GET',undefined,403);
  log('activation_login_duplicate_and_isolation_passed');
  phase='router';
  for(const [to,status] of [[address,204],['nonexistent-pilot-20261105@chatvice.app',404]] as const){const r=await fetch(origin+'/api/mail/router/recipient',{method:'POST',headers:{Authorization:'Bearer '+process.env.CHATVICE_MAIL_ROUTER_SECRET,'Content-Type':'application/json'},body:JSON.stringify({address:to}),signal:AbortSignal.timeout(15000)});assert.equal(r.status,status);}
  phase='inbound_probe';
  await until(async()=>{const q=await pool.query('SELECT state,inbound_verified_at FROM mail_mailbox_provisioning WHERE mailbox_id=$1',[box]);if(q.rows[0]?.state==='failed')throw new Error('probe failed');return q.rows[0]?.state==='verified'&&!!q.rows[0]?.inbound_verified_at;},720000);
  log('real_inbound_probe_verified');
  phase='outbound_attachment';const outgoing=await uploadAndSend(marker,marker+' outbound test. Please reply with the synthetic attachment.');
  log('outbound_sent_waiting_for_gmail_reply',{messageId:outgoing.id,threadId:outgoing.threadId});
  phase='external_inbound_attachment';
  const received=await until(async()=>{
    const threads=await json('/api/mail/threads?mailboxId='+box+'&folder=inbox');
    for(const thread of threads){const messages=await json('/api/mail/threads/'+thread.id);const m=messages.find((x:any)=>x.direction==='inbound'&&x.from_email===target&&x.text_body.includes(marker+' INBOUND'));
      if(m){const attachments=await json('/api/mail/messages/'+m.id+'/attachments');const a=attachments.find((x:any)=>x.original_filename==='chatvice-onboarding-proof.txt');if(!a)return false;
        const data=await (await request('/api/mail/attachments/'+a.id+'/download')).text();assert.equal(data,attachmentText);return m;}}
    return false;
  },900000);
  log('external_inbound_attachment_exact_bytes_passed',{messageId:received.id});
  phase='reply';const reply=await uploadAndSend('Re: '+marker,marker+' FINAL-REPLY verified.',received.id);
  assert.equal(reply.threadId,received.thread_id);
  const header=await pool.query('SELECT in_reply_to FROM mail_messages WHERE id=$1 AND mailbox_id=$2',[reply.id,box]);assert.ok(header.rows[0].in_reply_to);
  const ready=await pool.query('SELECT p.state,p.inbound_verified_at,u.enabled,u.is_admin FROM mail_mailbox_provisioning p JOIN mail_login_users u ON u.id=p.login_id WHERE p.mailbox_id=$1',[box]);
  assert.equal(ready.rows[0].state,'verified');assert.equal(ready.rows[0].enabled,true);assert.equal(ready.rows[0].is_admin,false);
  const after=await pool.query('SELECT id,enabled,credential_version,password_hash FROM mail_login_users WHERE id<>$1 ORDER BY id',[login]);assert.deepEqual(after.rows,before.rows);
  log('reply_and_ready_passed',{messageId:reply.id});
  await json('/api/mail-auth/logout','POST',{});await request('/api/mail-auth/session','GET',undefined,401);
  log('CHATVICE_MAIL_LIVE_PILOT_PASSED');
}
run().catch(()=>{log('FAILED',{phase});process.exitCode=1;}).finally(async()=>{
  if(box&&login){
    // Retain test evidence, but retire only the account created by this process.
    const c=await pool.connect();try{await c.query('BEGIN');
      await c.query('UPDATE mail_login_users SET enabled=false,credential_version=credential_version+1 WHERE id=$1 AND tenant_id=$2 AND email=$3 AND is_admin=false',[login,tenant,address]);
      await c.query('UPDATE mail_mailboxes SET enabled=false WHERE id=$1 AND tenant_id=$2 AND local_part=$3',[box,tenant,local]);
      await c.query('COMMIT');log('pilot_retired_without_deleting_evidence');
    }catch{await c.query('ROLLBACK');log('pilot_cleanup_failed');process.exitCode=1;}finally{c.release();}
  }
  await pool.end();
});
