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
   const second=run(url);
   assert.equal(second.status,0,second.stderr);
   const count=await q.query("SELECT count(*)::integer AS n FROM mail_mailboxes");
   assert.equal(count.rows[0].n,1);
  }finally{await q.end();}
 });
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
});
test.after(async()=>{await pool.end();});
