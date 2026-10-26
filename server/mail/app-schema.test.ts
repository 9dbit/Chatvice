import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
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
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM mail_schema_migrations")).rows[0].n,3);
    assert.equal((await pool.query("SELECT id FROM merchants")).rows[0].id,"mail_schema_ci");
    assert.equal((await pool.query("SELECT count(*)::integer AS n FROM mail_login_users")).rows[0].n,0);
    assert.equal(run(url).status,0);
    await pool.query("UPDATE mail_schema_migrations SET sha256=$1",["0".repeat(64)]);
    assert.notEqual(run(url).status,0);
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
