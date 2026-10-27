/** Reviewed schema installer for an empty isolated Mail DB or its exact recorded history, never main Chatvice. */
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
const files=['20261026_chatvice_mail_v1.sql','20261026_chatvice_mail_attachments_v2.sql','20261027_chatvice_mail_login.sql','20261027_chatvice_mail_delivery_recipients_v3.sql'];
const immutablePrefix=[
  '663e18cdab839da45b98503c682dd6be5e4439e319fe65ce493086ef85557b91',
  'f981777a7ad9ab3d2da6f120c146e1e50110153a7c7a8dfdd33dc425dedb89cb',
  '95600ce5ae209aa918cbf217732eda36e4d00389310f88e2a15b2d2697e9a062'
];
const migrations=files.map(name=>{
  const sql=readFileSync('migrations/'+name,'utf8');
  return {name,sha:createHash('sha256').update(sql).digest('hex'),sql:sql.replace(/^\s*(BEGIN|COMMIT);\s*$/gm,'')};
});
if(immutablePrefix.some((sha,index)=>migrations[index].sha!==sha))
  throw Error('Reviewed migration files changed; manual review required');
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
    // Only the known three-migration release may advance to this release.
    // Gaps, unknown histories, edited files and tenant changes are never adopted.
    if(![immutablePrefix.length,migrations.length].includes(applied.rowCount)||
       migrations.slice(0,applied.rowCount).some(m=>!applied.rows.some(a=>a.name===m.name&&a.sha256===m.sha&&a.initial_tenant===tenant)))
      throw Error('Schema history mismatch; manual review required');
    for(const name of expected)
      if(!tables.rows.some(t=>t.table_name===name))throw Error('Incomplete isolated Mail schema');
    if((await c.query('SELECT id FROM merchants WHERE id=$1',[tenant])).rowCount!==1)
      throw Error('Initial tenant mismatch');
    if(applied.rowCount===immutablePrefix.length&&(await c.query(`SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='mail_delivery_events' AND column_name='recipient_keys'`)).rowCount)
      throw Error('Unrecorded delivery schema requires manual review');
    for(const m of migrations.slice(applied.rowCount)){
      await c.query(m.sql);
      await c.query('INSERT INTO mail_schema_migrations(name,sha256,initial_tenant) VALUES($1,$2,$3)',[m.name,m.sha,tenant]);
    }
    const recipientColumn=await c.query(`SELECT udt_name,is_nullable,column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='mail_delivery_events' AND column_name='recipient_keys'`);
    if(recipientColumn.rowCount!==1||recipientColumn.rows[0].udt_name!=='_text'||
       recipientColumn.rows[0].is_nullable!=='NO'||recipientColumn.rows[0].column_default!=="'{}'::text[]")
      throw Error('Delivery recipient schema mismatch');
    await c.query('COMMIT');console.log(applied.rowCount===migrations.length?
      '[Mail schema] reviewed history already current':'[Mail schema] reviewed additive migration applied atomically');
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
