import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createHash,randomUUID} from "node:crypto";
import pg from "pg";
if(process.env.CHATVICE_MAIL_INTEGRATION_DB!=="isolated-ci"||!process.env.DATABASE_URL)
  throw new Error("Disposable CI database required");
const root=new URL(process.env.DATABASE_URL);
const admin=new pg.Pool({connectionString:root.href,max:1});
function run(url:string,extra:Record<string,string>={}){
  return spawnSync("node",["scripts/mail-app-schema.mjs"],{encoding:"utf8",timeout:20000,env:{
    ...process.env,DATABASE_URL:url,CHATVICE_MAIL_APP_ROLE:"isolated-mail",CHATVICE_MAIL_SCHEMA_INSTALL:"reviewed-isolated-only",
    CHATVICE_MAIL_SCHEMA_EXPECTED_HOST:root.hostname,CHATVICE_MAIL_INITIAL_TENANT:"mail_schema_ci",CHATVICE_MAIL_QA_BOOTSTRAP:"false",...extra
  }});
}
const legacyFiles=['20261026_chatvice_mail_v1.sql','20261026_chatvice_mail_attachments_v2.sql','20261027_chatvice_mail_login.sql'];
async function legacy(pool:pg.Pool){
  await pool.query(`CREATE TABLE merchants(id varchar(32) PRIMARY KEY);
    CREATE TABLE supervisors(id varchar(64) PRIMARY KEY,merchant_id varchar(32) NOT NULL REFERENCES merchants(id));
    CREATE TABLE leads(id varchar(32) PRIMARY KEY,merchant_id varchar(32) NOT NULL REFERENCES merchants(id),
      customer_name text,customer_email text,stage text,score integer,source text,last_contact_at timestamptz,
      created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE mail_schema_migrations(name text PRIMARY KEY,sha256 char(64) NOT NULL,
      initial_tenant varchar(32) NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());`);
  for(const name of legacyFiles){
    const sql=readFileSync('migrations/'+name,'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO mail_schema_migrations(name,sha256,initial_tenant) VALUES($1,$2,$3)',
      [name,createHash('sha256').update(sql).digest('hex'),'mail_schema_ci']);
  }
  await pool.query("INSERT INTO merchants(id) VALUES('mail_schema_ci')");
}
async function isolated(name:string,fn:(url:string,pool:pg.Pool)=>Promise<void>){
  const target=new URL(root.href);target.pathname="/chatvice_mail_schema_"+name;
  await admin.query(`CREATE DATABASE "chatvice_mail_schema_${name}"`);
  const pool=new pg.Pool({connectionString:target.href,max:1});
  try{await fn(target.href,pool);}finally{
    await pool.end();
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`,[target.pathname.slice(1)]);
    await admin.query(`DROP DATABASE "chatvice_mail_schema_${name}"`);
  }
}
test("isolated app installer initializes empty schema atomically and verifies immutable history",async()=>{
  await isolated("empty",async(url,pool)=>{
    const first=run(url);assert.equal(first.status,0,first.stderr);
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM mail_schema_migrations")).rows[0].n,4);
    const column=await pool.query("SELECT column_default,is_nullable,udt_name FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'");
    assert.deepEqual(column.rows,[{column_default:"'{}'::text[]",is_nullable:"NO",udt_name:"_text"}]);
    assert.equal((await pool.query("SELECT id FROM merchants")).rows[0].id,"mail_schema_ci");
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM mail_login_users")).rows[0].n,0);
    assert.equal(run(url).status,0);
    await pool.query("UPDATE mail_schema_migrations SET sha256=$1",["0".repeat(64)]);
    assert.notEqual(run(url).status,0);
  });
});
test("installer upgrades only the exact immutable three-file prefix and preserves existing records",async()=>{
  await isolated("upgrade",async(url,pool)=>{
    await legacy(pool);
    const history=await pool.query('SELECT name,sha256,initial_tenant,applied_at FROM mail_schema_migrations ORDER BY name');
    const login=randomUUID();
    await pool.query(`INSERT INTO mail_login_users(id,tenant_id,user_id,email,password_hash)
      VALUES($1,'mail_schema_ci','existing-reader','reader@schema.example.invalid','scrypt1.synthetic-fixture')`,[login]);
    const domain=randomUUID(),box=randomUUID(),thread=randomUUID(),message=randomUUID(),multi=randomUUID(),event=randomUUID();
    await pool.query(`INSERT INTO mail_domains(id,tenant_id,domain,verification_token,status)
      VALUES($1,'mail_schema_ci','schema.example.invalid','synthetic','verified')`,[domain]);
    await pool.query(`INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part)
      VALUES($1,'mail_schema_ci',$2,'hello')`,[box,domain]);
    await pool.query(`INSERT INTO mail_threads(id,tenant_id,mailbox_id) VALUES($1,'mail_schema_ci',$2)`,[thread,box]);
    await pool.query(`INSERT INTO mail_messages(id,tenant_id,mailbox_id,thread_id,direction,folder,status,from_email,to_emails,bcc_emails,text_body,delivered_at)
      VALUES($1,'mail_schema_ci',$2,$3,'outbound','sent','delivered','hello@schema.example.invalid','["one@example.invalid"]','[]','preserved-single-ciphertext-fixture',now()),
      ($4,'mail_schema_ci',$2,$3,'outbound','sent','delivered','hello@schema.example.invalid','["one@example.invalid"]','["private@example.invalid"]','preserved-multi-ciphertext-fixture',now())`,[message,box,thread,multi]);
    await pool.query(`INSERT INTO mail_delivery_events(id,tenant_id,message_id,provider_event_id,event_type)
      VALUES($1,'mail_schema_ci',$2,'legacy-single-event','email.delivered')`,[event,message]);
    const result=run(url);assert.equal(result.status,0,result.stderr);
    const current=await pool.query('SELECT name,sha256,initial_tenant,applied_at FROM mail_schema_migrations WHERE name=ANY($1::text[]) ORDER BY name',[legacyFiles]);
    assert.deepEqual(current.rows,history.rows,'existing history must be immutable');
    assert.equal((await pool.query('SELECT email FROM mail_login_users WHERE id=$1',[login])).rows[0].email,'reader@schema.example.invalid');
    assert.deepEqual((await pool.query('SELECT provider_event_id,recipient_keys FROM mail_delivery_events WHERE id=$1',[event])).rows,
      [{provider_event_id:'legacy-single-event',recipient_keys:[]}],'old events remain intact and acquire no invented recipient evidence');
    const messages=await pool.query('SELECT id,status,folder,text_body,delivered_at FROM mail_messages ORDER BY id');
    const single=messages.rows.find(row=>row.id===message),multiple=messages.rows.find(row=>row.id===multi);
    assert.equal(single.status,'delivered');assert.ok(single.delivered_at);
    assert.equal(single.text_body,'preserved-single-ciphertext-fixture');
    assert.equal(multiple.status,'sent');assert.equal(multiple.folder,'sent');assert.equal(multiple.delivered_at,null);
    assert.equal(multiple.text_body,'preserved-multi-ciphertext-fixture');
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM mail_schema_migrations')).rows[0].n,4);
    assert.equal(run(url).status,0);
  });
});
test("installer refuses gaps, unknown history, checksum drift and unrecorded columns before upgrade",async()=>{
  await isolated("drift",async(url,pool)=>{
    await legacy(pool);
    const first=legacyFiles[0],original=readFileSync('migrations/'+first,'utf8');
    const sha=createHash('sha256').update(original).digest('hex');
    const unchanged=async()=>{
      assert.equal((await pool.query("SELECT count(*)::integer AS n FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'")).rows[0].n,0);
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM mail_schema_migrations')).rows[0].n,3);
    };
    await pool.query('UPDATE mail_schema_migrations SET sha256=$1 WHERE name=$2',['0'.repeat(64),first]);
    assert.notEqual(run(url).status,0);await unchanged();
    await pool.query('UPDATE mail_schema_migrations SET sha256=$1 WHERE name=$2',[sha,first]);
    await pool.query('UPDATE mail_schema_migrations SET name=$1 WHERE name=$2',['unknown-reviewed-file.sql',first]);
    assert.notEqual(run(url).status,0);await unchanged();
    await pool.query('UPDATE mail_schema_migrations SET name=$1 WHERE name=$2',[first,'unknown-reviewed-file.sql']);
    await pool.query('DELETE FROM mail_schema_migrations WHERE name=$1',[first]);
    assert.notEqual(run(url).status,0);
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM information_schema.columns WHERE table_name='mail_delivery_events' AND column_name='recipient_keys'")).rows[0].n,0);
    await pool.query('INSERT INTO mail_schema_migrations(name,sha256,initial_tenant) VALUES($1,$2,$3)',[first,sha,'mail_schema_ci']);
    await pool.query("ALTER TABLE mail_delivery_events ADD COLUMN recipient_keys text[] NOT NULL DEFAULT '{}'::text[]");
    assert.notEqual(run(url).status,0,'unrecorded matching columns must not be adopted');
    assert.equal((await pool.query('SELECT count(*)::integer AS n FROM mail_schema_migrations')).rows[0].n,3);
  });
});
test("installer refuses occupied databases and wrong expected host without modifying data",async()=>{
  await isolated("occupied",async(url,pool)=>{
    await pool.query("CREATE TABLE existing_customer_data(id integer PRIMARY KEY)");
    assert.notEqual(run(url).status,0);
    const tables=await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    assert.deepEqual(tables.rows.map(x=>x.table_name),["existing_customer_data"]);
  });
  await isolated("wronghost",async(url,pool)=>{
    assert.notEqual(run(url,{CHATVICE_MAIL_SCHEMA_EXPECTED_HOST:"different-host.invalid"}).status,0);
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n,0);
  });
});
test.after(async()=>{await admin.end();});
