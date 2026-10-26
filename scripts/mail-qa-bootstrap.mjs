/**
 * Chatvice Mail QA database bootstrap.
 * Creates a minimal self-contained mail-test schema on a disposable EMPTY DB.
 * Refuses existing populated schemas and refuses Railway production.
 * Does not invoke drizzle-kit push or touch unrelated Chatvice tables.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const tenant="qa_mail_merchant";
const domain="qa-mail.example.invalid";
const guard=()=>{
 if(process.env.CHATVICE_MAIL_QA_BOOTSTRAP!=="true" ||
    process.env.CHATVICE_MAIL_QA_ROLE!=="isolated-chatvice-mail" ||
    !process.env.DATABASE_URL ||
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
   const existing=await client.query(`SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
   if(existing.rows.some(x=>x.table_name==="chatvice_mail_qa_bootstrap")){
     const count=await client.query("SELECT count(*)::integer AS n FROM chatvice_mail_qa_bootstrap WHERE id=1");
     if(count.rows[0]?.n!==1)throw new Error("QA marker inconsistent; refuse startup");
     console.log("[Mail QA] Previously initialized disposable schema");
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
   await client.query(readFileSync("migrations/20261026_chatvice_mail_v1.sql","utf8"));
   await client.query(readFileSync("migrations/20261026_chatvice_mail_attachments_v2.sql","utf8"));
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
      id integer PRIMARY KEY CHECK(id=1),completed_at timestamptz NOT NULL DEFAULT now())`);
   await client.query("INSERT INTO chatvice_mail_qa_bootstrap(id) VALUES(1)");
   console.log("[Mail QA] Isolated empty database initialized with synthetic test identity");
 }finally{
   await client.query("SELECT pg_advisory_unlock(772130026)").catch(()=>{});
   client.release();await pool.end();
 }
}
main().catch(err=>{
 console.error("[Mail QA] "+(err instanceof Error?err.message:"Bootstrap failed"));
 process.exitCode=1;
});
