/**
 * Chatvice Mail QA database bootstrap.
 * Creates a minimal self-contained mail-test schema on a disposable EMPTY DB.
 * Refuses existing populated schemas and refuses Railway production.
 * Does not invoke drizzle-kit push or touch unrelated Chatvice tables.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";

const tenant="qa_mail_merchant";
const domain="qa-mail.example.invalid";
const deliveryFile="20261027_chatvice_mail_delivery_recipients_v3.sql";
const deliverySQL=readFileSync("migrations/"+deliveryFile,"utf8");
const deliverySHA=createHash("sha256").update(deliverySQL).digest("hex");
const withoutTransaction=sql=>sql.replace(/^\s*(BEGIN|COMMIT);\s*$/gm,"");
const expectedTables=["merchants","supervisors","leads","mail_domains","mail_mailboxes",
 "mail_memberships","mail_aliases","mail_threads","mail_messages","mail_attachments",
 "mail_delivery_events","chatvice_mail_qa_bootstrap"];
async function recipientColumn(client){
 const column=await client.query(`SELECT udt_name,is_nullable,column_default FROM information_schema.columns
  WHERE table_schema='public' AND table_name='mail_delivery_events' AND column_name='recipient_keys'`);
 if(column.rowCount!==1||column.rows[0].udt_name!=="_text"||column.rows[0].is_nullable!=="NO"||column.rows[0].column_default!=="'{}'::text[]")
  throw new Error("QA delivery recipient schema mismatch");
}
const guard=()=>{
 if(process.env.CHATVICE_MAIL_QA_BOOTSTRAP!=="true" ||
    process.env.CHATVICE_MAIL_QA_ROLE!=="isolated-chatvice-mail" ||
    !process.env.DATABASE_URL ||
    process.env.CHATVICE_MAIL_APP_ROLE==="isolated-mail" ||
    process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase()==="production" ||
    process.env.CHATVICE_MAIL_QA_DB_KIND!=="disposable-empty-only") {
   throw new Error("QA bootstrap guard denied execution");
 }
};
async function main(){
 guard();
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000,max:1});
 const client=await pool.connect();
 try{
   await client.query("SELECT pg_advisory_lock(772130026)");
   await client.query("BEGIN");
   const existing=await client.query(`SELECT table_schema,table_name FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE' ORDER BY table_name`);
   if(existing.rows.some(x=>x.table_name==="chatvice_mail_qa_bootstrap")){
     if(existing.rows.some(x=>x.table_schema!=="public"||!expectedTables.includes(x.table_name))||
        expectedTables.some(name=>!existing.rows.some(x=>x.table_name===name)))
       throw new Error("QA schema contains unmanaged or missing tables; refuse upgrade");
     const count=await client.query("SELECT count(*)::integer AS n FROM chatvice_mail_qa_bootstrap WHERE id=1");
     if(count.rows[0]?.n!==1)throw new Error("QA marker inconsistent; refuse startup");
     const owners=await client.query("SELECT id FROM merchants");
     const domains=await client.query("SELECT tenant_id,domain FROM mail_domains");
     if(owners.rowCount!==1||owners.rows[0].id!==tenant||!domains.rowCount||
        domains.rows.some(x=>x.tenant_id!==tenant||x.domain!==domain))
       throw new Error("QA synthetic identity mismatch; refuse upgrade");
     const checksumColumn=await client.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name='chatvice_mail_qa_bootstrap' AND column_name='delivery_schema_sha256'`);
     if(!checksumColumn.rowCount){
       if((await client.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public'
         AND table_name='mail_delivery_events' AND column_name='recipient_keys'`)).rowCount)
         throw new Error("Unrecorded QA delivery schema requires manual review");
       await client.query(withoutTransaction(deliverySQL));
       await client.query("ALTER TABLE chatvice_mail_qa_bootstrap ADD COLUMN delivery_schema_sha256 char(64)");
       await client.query("UPDATE chatvice_mail_qa_bootstrap SET delivery_schema_sha256=$1 WHERE id=1",[deliverySHA]);
     }else{
       const recorded=await client.query("SELECT delivery_schema_sha256 FROM chatvice_mail_qa_bootstrap WHERE id=1");
       if(recorded.rows[0]?.delivery_schema_sha256!==deliverySHA)throw new Error("QA delivery migration history mismatch");
     }
     await recipientColumn(client);
     await client.query("COMMIT");
     console.log("[Mail QA] Disposable schema delivery migration verified");
     return;
   }
   if(existing.rowCount!==0)throw new Error("Refusing bootstrap: target PostgreSQL is not empty");
   await client.query(`CREATE TABLE merchants(id varchar(32) PRIMARY KEY)`);
   await client.query(`CREATE TABLE supervisors(
     id varchar(64) PRIMARY KEY,merchant_id varchar(32) NOT NULL REFERENCES merchants(id))`);
   await client.query(`CREATE TABLE leads(
     id varchar(32) PRIMARY KEY,merchant_id varchar(32) NOT NULL REFERENCES merchants(id),
     customer_name text,customer_email text,stage text,score integer,source text,
     last_contact_at timestamptz,created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now())`);
   // The SQL migrations run only after an empty-DB check.
   await client.query(withoutTransaction(readFileSync("migrations/20261026_chatvice_mail_v1.sql","utf8")));
   await client.query(withoutTransaction(readFileSync("migrations/20261026_chatvice_mail_attachments_v2.sql","utf8")));
   await client.query(withoutTransaction(deliverySQL));
   await recipientColumn(client);
   await client.query("INSERT INTO merchants(id) VALUES($1)",[tenant]);
   // Demo-only .invalid test domain; cannot be sent from via Resend.
   const {randomUUID}=await import("node:crypto");
   const domainId=randomUUID(),mailboxId=randomUUID();
   await client.query(`INSERT INTO mail_domains(
     id,tenant_id,domain,verification_token,status)
     VALUES($1,$2,$3,$4,'verified')`,[domainId,tenant,domain,randomUUID()]);
   await client.query(`INSERT INTO mail_mailboxes(
     id,tenant_id,domain_id,local_part,display_name)
     VALUES($1,$2,$3,'hello','QA Sandbox Mailbox')`,[mailboxId,tenant,domainId]);
   await client.query(`CREATE TABLE chatvice_mail_qa_bootstrap(
      id integer PRIMARY KEY CHECK(id=1),completed_at timestamptz NOT NULL DEFAULT now(),delivery_schema_sha256 char(64))`);
   await client.query("INSERT INTO chatvice_mail_qa_bootstrap(id,delivery_schema_sha256) VALUES(1,$1)",[deliverySHA]);
   await client.query("COMMIT");
   console.log("[Mail QA] Isolated empty database initialized with synthetic test identity");
 }catch(error){
   await client.query("ROLLBACK").catch(()=>{});
   throw error;
 }finally{
   await client.query("SELECT pg_advisory_unlock(772130026)").catch(()=>{});
   client.release();await pool.end();
 }
}
main().catch(err=>{
 console.error("[Mail QA] "+(err instanceof Error?err.message:"Bootstrap failed"));
 process.exitCode=1;
});
