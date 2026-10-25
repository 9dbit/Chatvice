/**
 * One-time, fail-closed bootstrap ONLY for an empty disposable Mail QA database.
 * Never execute against an existing Chatvice or production database.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import pg from "pg";

async function main() {
  if(process.env.CHATVICE_MAIL_QA_BOOTSTRAP!=="true" ||
     process.env.CHATVICE_MAIL_QA_ROLE!=="isolated-chatvice-mail" ||
     !process.env.DATABASE_URL) {
    throw new Error("Isolated Mail QA bootstrap guard not satisfied");
  }
  const environment=(process.env.RAILWAY_ENVIRONMENT_NAME||"").toLowerCase();
  if(environment==="production")throw new Error("Refusing Mail QA schema bootstrap in production environment");
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,max:2});
  try{
    const existing=await pool.query(`SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
    if(existing.rows.some(r=>r.table_name==="chatvice_mail_qa_bootstrap")){
      console.log("[Mail QA] Schema already bootstrapped; no modifications");
      return;
    }
    if(existing.rowCount!==0)throw new Error(
      "Refusing Mail QA bootstrap: database contains pre-existing tables"
    );
    await pool.end();
    // Drizzle initializes all existing Chatvice relations on a disposable database,
    // then reviewed mail constraints/indexes are applied by SQL.
    execFileSync("./node_modules/.bin/drizzle-kit",["push","--force"],{
      stdio:"inherit",timeout:120000,env:process.env
    });
    const verify=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,max:2});
    try{
      // The SQL files are safe and additive when Drizzle created matching tables.
      await verify.query(readFileSync("migrations/20261026_chatvice_mail_v1.sql","utf8"));
      await verify.query(readFileSync("migrations/20261026_chatvice_mail_attachments_v2.sql","utf8"));
      await verify.query(`CREATE TABLE IF NOT EXISTS chatvice_mail_qa_bootstrap(
        id integer PRIMARY KEY CHECK(id=1),
        completed_at timestamptz NOT NULL DEFAULT now()
      )`);
      await verify.query("INSERT INTO chatvice_mail_qa_bootstrap(id) VALUES (1) ON CONFLICT(id) DO NOTHING");
      console.log("[Mail QA] Disposable database initialized; Mail feature remains disabled by default");
    }finally{await verify.end();}
  }finally{if(!pool.ended)await pool.end();}
}
main().catch(err=>{
  console.error("[Mail QA] "+(err instanceof Error?err.message:"Bootstrap error"));
  process.exitCode=1;
});
