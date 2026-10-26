/** Reviewed schema installer for an EMPTY isolated Mail DB, never main Chatvice. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL||'',host=process.env.CHATVICE_MAIL_SCHEMA_EXPECTED_HOST||'';
if(process.env.CHATVICE_MAIL_APP_ROLE!=='isolated-mail'||
   process.env.CHATVICE_MAIL_SCHEMA_INSTALL!=='reviewed-isolated-only'||
   process.env.CHATVICE_MAIL_QA_BOOTSTRAP==='true'||!host||new URL(url).hostname!==host)
  throw Error('Isolated Mail schema guard denied');
const tenant=process.env.CHATVICE_MAIL_INITIAL_TENANT||'';
if(!/^[a-zA-Z0-9_-]{1,32}$/.test(tenant))throw Error('Explicit initial Mail tenant required');
const files=['20261026_chatvice_mail_v1.sql','20261026_chatvice_mail_attachments_v2.sql','20261027_chatvice_mail_login.sql'];
const migrations=files.map(name=>{
  const sql=readFileSync('migrations/'+name,'utf8');
  return {name,sha:createHash('sha256').update(sql).digest('hex'),sql:sql.replace(/^\s*(BEGIN|COMMIT);\s*$/gm,'')};
});
const pool=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:10000});
const c=await pool.connect();
try{
  await c.query('SELECT pg_advisory_lock(772130027)');
  await c.query('BEGIN');
  const expected=['merchants','supervisors','leads','mail_schema_migrations','mail_domains','mail_mailboxes',
    'mail_memberships','mail_aliases','mail_threads','mail_messages','mail_attachments','mail_delivery_events',
    'mail_login_users','mail_login_sessions','mail_login_limits'];
  const tables=await c.query(`SELECT table_schema,table_name FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'`);
  if(tables.rows.some(t=>t.table_schema!=='public'||!expected.includes(t.table_name)))
    throw Error('Unmanaged tables require manual review');
  if(tables.rows.some(x=>x.table_name==='mail_schema_migrations')){
    const applied=await c.query('SELECT name,sha256,initial_tenant FROM mail_schema_migrations');
    if(applied.rowCount!==migrations.length||migrations.some(m=>!applied.rows.some(a=>a.name===m.name&&a.sha256===m.sha&&a.initial_tenant===tenant)))
      throw Error('Schema history mismatch; manual review required');
    for(const name of expected)
      if(!tables.rows.some(t=>t.table_name===name))throw Error('Incomplete isolated Mail schema');
    if((await c.query('SELECT id FROM merchants WHERE id=$1',[tenant])).rowCount!==1)
      throw Error('Initial tenant mismatch');
    await c.query('COMMIT');console.log('[Mail schema] reviewed history already current');
  }else{
    if(tables.rowCount!==0)throw Error('Refusing nonempty database without isolated Mail history');
    await c.query(`CREATE TABLE merchants(id varchar(32) PRIMARY KEY);
      CREATE TABLE supervisors(id varchar(64) PRIMARY KEY,merchant_id varchar(32) NOT NULL REFERENCES merchants(id));
      CREATE TABLE leads(id varchar(32) PRIMARY KEY,merchant_id varchar(32) NOT NULL REFERENCES merchants(id),
        customer_name text,customer_email text,stage text,score integer,source text,last_contact_at timestamptz,
        created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE mail_schema_migrations(name text PRIMARY KEY,sha256 char(64) NOT NULL,
        initial_tenant varchar(32) NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());`);
    for(const m of migrations){
      await c.query(m.sql);
      await c.query('INSERT INTO mail_schema_migrations(name,sha256,initial_tenant) VALUES($1,$2,$3)',[m.name,m.sha,tenant]);
    }
    await c.query('INSERT INTO merchants(id) VALUES($1)',[tenant]);
    await c.query('COMMIT');console.log('[Mail schema] empty isolated database initialized atomically; no login credentials created');
  }
}catch(error){await c.query('ROLLBACK');console.error('[Mail schema] installation refused; verify target, emptiness and migration history');process.exitCode=1;}
finally{await c.query('SELECT pg_advisory_unlock(772130027)').catch(()=>{});c.release();await pool.end();}
