// Offline operator command. Preview by default; secrets are read from environment.
import {randomUUID} from "node:crypto";
import pg from "pg";
import {hashMailPassword} from "../server/mail/password";
const connection=process.env.DATABASE_URL||"",expected=process.env.MAIL_PROVISION_EXPECTED_HOST||"";
if(process.env.CHATVICE_MAIL_APP_ROLE!=="isolated-mail" || !expected || new URL(connection).hostname!==expected)
  throw new Error("Explicit isolated Mail database and expected host required");
const tenant=process.env.MAIL_PROVISION_TENANT||"",user=process.env.MAIL_PROVISION_USER||"";
const email=(process.env.MAIL_PROVISION_EMAIL||"").trim().toLowerCase();
const admin=process.env.MAIL_PROVISION_ADMIN==="true";
if(!/^[a-zA-Z0-9_-]{1,32}$/.test(tenant)||!/^[a-zA-Z0-9_-]{1,32}$/.test(user)||
   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>320||(admin&&tenant!==user))
  throw new Error("Invalid Mail identity");
const pool=new pg.Pool({connectionString:connection,max:1});
try{
  const c=await pool.connect();
  try{
    await c.query("BEGIN");
    const merchant=await c.query("SELECT id FROM merchants WHERE id=$1",[tenant]);
    if(!merchant.rowCount)throw new Error("Mail tenant missing");
    if(!admin){
      const member=await c.query(`SELECT s.id FROM supervisors s WHERE s.id=$1 AND s.merchant_id=$2
        AND EXISTS(SELECT 1 FROM mail_memberships m WHERE m.tenant_id=$2 AND m.user_id=$1)`,[user,tenant]);
      if(!member.rowCount)throw new Error("Existing supervisor and explicit mailbox membership required");
    }
    if(!process.argv.includes("--apply")){
      await c.query("ROLLBACK");console.log(JSON.stringify({valid:true,preview:true,tenant,user,email,admin}));
    }else{
      const password=process.env.MAIL_PROVISION_PASSWORD||"";delete process.env.MAIL_PROVISION_PASSWORD;
      const hash=await hashMailPassword(password);
      await c.query(`INSERT INTO mail_login_users(id,tenant_id,user_id,email,password_hash,is_admin)
        VALUES($1,$2,$3,$4,$5,$6)`,[randomUUID(),tenant,user,email,hash,admin]);
      await c.query("COMMIT");console.log(JSON.stringify({created:true,email}));
    }
  }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}finally{await pool.end();}
