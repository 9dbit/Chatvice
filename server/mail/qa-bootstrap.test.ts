import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { spawnSync } from "node:child_process";
const root=process.env.DATABASE_URL;
if(!root || process.env.CHATVICE_MAIL_INTEGRATION_DB!=="isolated-ci"){
 throw new Error("QA bootstrap tests require isolated disposable PostgreSQL");
}
const rootURL=new URL(root);
const pool=new pg.Pool({connectionString:root,max:1});
const guardEnv=(url:string)=>({
 ...process.env,
 DATABASE_URL:url,
 CHATVICE_MAIL_QA_BOOTSTRAP:"true",
 CHATVICE_MAIL_QA_ROLE:"isolated-chatvice-mail",
 CHATVICE_MAIL_QA_DB_KIND:"disposable-empty-only",
 CHATVICE_MAIL_APP_ROLE:"",
 RAILWAY_ENVIRONMENT_NAME:"cutover-staging",
});
function run(url:string,overrides:Record<string,string>={}){
 return spawnSync("node",["scripts/mail-qa-bootstrap.mjs"],{
  env:{...guardEnv(url),...overrides},encoding:"utf8",timeout:18000
 });
}
async function disposable(name:string,fn:(url:string)=>Promise<void>){
 const db="chatvice_qa_"+name;
 const target=new URL(rootURL.href);target.pathname="/"+db;
 await pool.query(`CREATE DATABASE "${db}"`);
 try{await fn(target.toString());}
 finally{
  await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
    WHERE datname=$1 AND pid<>pg_backend_pid()`,[db]);
  await pool.query(`DROP DATABASE "${db}"`);
 }
}
test("QA bootstrap initializes only an empty disposable DB and is idempotent",async()=>{
 await disposable("init",async url=>{
  const result=run(url);
  assert.equal(result.status,0,result.stderr);
  const q=new pg.Pool({connectionString:url});
  try{
   const marker=await q.query("SELECT completed_at FROM chatvice_mail_qa_bootstrap WHERE id=1");
   assert.equal(marker.rowCount,1);
   const mailbox=await q.query(`SELECT b.local_part,d.domain,d.status FROM mail_mailboxes b
     JOIN mail_domains d ON d.id=b.domain_id`);
   assert.equal(mailbox.rowCount,1);
   assert.equal(mailbox.rows[0].domain,"qa-mail.example.invalid");
   assert.equal(mailbox.rows[0].local_part,"hello");
   const recipient=await q.query("SELECT column_default,is_nullable,udt_name FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'");
   assert.deepEqual(recipient.rows,[{column_default:"'{}'::text[]",is_nullable:"NO",udt_name:"_text"}]);
   assert.equal((await q.query("SELECT count(*)::integer AS n FROM information_schema.tables WHERE table_name='mail_login_users'")).rows[0].n,0,'QA must not acquire the independent app login schema');
   const second=run(url);
   assert.equal(second.status,0,second.stderr);
   const count=await q.query("SELECT count(*)::integer AS n FROM mail_mailboxes");
   assert.equal(count.rows[0].n,1);
  }finally{await q.end();}
 });
});
test("QA upgrades its prior disposable marker schema additively and verifies the delivery checksum",async()=>{
 await disposable("upgrade",async url=>{
  assert.equal(run(url).status,0);
  const q=new pg.Pool({connectionString:url});
  try{
   const marker=await q.query("SELECT completed_at,delivery_schema_sha256 FROM chatvice_mail_qa_bootstrap WHERE id=1");
   const boxes=await q.query("SELECT id,tenant_id,local_part FROM mail_mailboxes ORDER BY id");
   // Recreate the exact prior QA shape: two base migrations and its marker.
   await q.query("ALTER TABLE mail_delivery_events DROP COLUMN recipient_keys");
   await q.query("ALTER TABLE chatvice_mail_qa_bootstrap DROP COLUMN delivery_schema_sha256");
   const upgraded=run(url);assert.equal(upgraded.status,0,upgraded.stderr);
   assert.deepEqual((await q.query("SELECT completed_at,delivery_schema_sha256 FROM chatvice_mail_qa_bootstrap WHERE id=1")).rows,marker.rows);
   assert.deepEqual((await q.query("SELECT id,tenant_id,local_part FROM mail_mailboxes ORDER BY id")).rows,boxes.rows);
   assert.equal(run(url).status,0);
   await q.query("UPDATE chatvice_mail_qa_bootstrap SET delivery_schema_sha256=$1",['0'.repeat(64)]);
   const drift=run(url);assert.notEqual(drift.status,0);assert.match(drift.stderr,/history mismatch/);
   assert.equal((await q.query("SELECT delivery_schema_sha256 FROM chatvice_mail_qa_bootstrap")).rows[0].delivery_schema_sha256,'0'.repeat(64));
  }finally{await q.end();}
 });
});
test("QA marker alone cannot authorize upgrades on non-synthetic or unmanaged schemas",async()=>{
 for(const kind of ['identity','unmanaged','unrecorded']){
  await disposable("marker_"+kind,async url=>{
   assert.equal(run(url).status,0);
   const q=new pg.Pool({connectionString:url});
   try{
    await q.query("ALTER TABLE chatvice_mail_qa_bootstrap DROP COLUMN delivery_schema_sha256");
    if(kind!=='unrecorded')await q.query("ALTER TABLE mail_delivery_events DROP COLUMN recipient_keys");
    if(kind==='identity')await q.query("UPDATE mail_domains SET domain='real-customer.example'");
    if(kind==='unmanaged')await q.query("CREATE TABLE existing_customer_data(id integer PRIMARY KEY)");
    assert.notEqual(run(url).status,0);
    assert.equal((await q.query("SELECT count(*)::integer AS n FROM information_schema.columns WHERE table_name='chatvice_mail_qa_bootstrap' AND column_name='delivery_schema_sha256'")).rows[0].n,0,'a refused upgrade must roll back marker changes');
    assert.equal((await q.query("SELECT count(*)::integer AS n FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'")).rows[0].n,kind==='unrecorded'?1:0);
   }finally{await q.end();}
  });
 }
});
test("QA bootstrap rejects occupied database and Railway production",async()=>{
 await disposable("occupied",async url=>{
  const q=new pg.Pool({connectionString:url});
  try{await q.query("CREATE TABLE existing_user_data(id integer PRIMARY KEY)");}
  finally{await q.end();}
  const failed=run(url);
  assert.notEqual(failed.status,0);
  assert.match(failed.stderr,/not empty/);
 });
 await disposable("prod",async url=>{
  const failed=run(url,{RAILWAY_ENVIRONMENT_NAME:"production"});
  assert.notEqual(failed.status,0);
  const q=new pg.Pool({connectionString:url});
  try{
   const count=await q.query(`SELECT count(*)::integer AS n FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'`);
   assert.equal(count.rows[0].n,0);
  }finally{await q.end();}
 });
 await disposable("approle",async url=>{
  assert.notEqual(run(url,{CHATVICE_MAIL_APP_ROLE:"isolated-mail"}).status,0);
 });
});
test.after(async()=>{await pool.end();});
