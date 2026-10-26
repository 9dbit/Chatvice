import type { Express,Request,Response,NextFunction } from "express";
import { createHmac,randomBytes } from "node:crypto";
import type { Pool } from "pg";
import {verifyMailPassword} from "./password";
export const MAIL_COOKIE="__Host-chatvice_mail";
const TTL=8*60*60*1000;
const COOKIE=`Path=/; Secure; HttpOnly; SameSite=Strict`;
function tokenFrom(req:Request):string|null{
  const matches=(req.get("cookie")||"").split(";").map(x=>x.trim())
    .filter(x=>x.startsWith(MAIL_COOKIE+"="));
  if(matches.length!==1)return null;
  const value=matches[0].slice(MAIL_COOKIE.length+1);
  return /^[a-f0-9]{64}$/.test(value)?value:null;
}
export function registerMailLogin(app:Express,pool:Pool,origin:string,secret:string){
  if(new URL(origin).protocol!=="https:" || new URL(origin).origin!==origin ||
     !/^[a-f0-9]{64}$/i.test(secret))throw new Error("Isolated Mail login configuration required");
  const hash=(purpose:string,value:string)=>createHmac("sha256",secret).update(purpose+"|"+value).digest("hex");
  const wrap=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response)=>{
    fn(req,res).catch(()=>res.status(503).json({error:"Mail authentication unavailable"}));
  };
  app.use("/api/mail-auth",(req,res,next)=>{
    res.setHeader("Cache-Control","private, no-store");
    if(!["GET","HEAD"].includes(req.method) && req.get("origin")!==origin)
      return res.status(403).json({error:"Mail origin not allowed"});
    next();
  });
  app.post("/api/mail-auth/login",wrap(async(req,res)=>{
    const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";
    const password=req.body?.password;
    if(email.length>320 || !email.includes("@") || typeof password!=="string" || password.length>256)
      return res.status(401).json({error:"Invalid email or password"});
    const window=new Date(Math.floor(Date.now()/900000)*900000);
    // Reserve attempts atomically before scrypt. Both limits persist across replicas/restarts.
    const limits=await pool.query(`INSERT INTO mail_login_limits(key_hash,window_start,attempts)
      VALUES($1,$3,1),($2,$3,1) ON CONFLICT(key_hash,window_start)
      DO UPDATE SET attempts=mail_login_limits.attempts+1 RETURNING key_hash,attempts`,[
      hash("ip",req.ip||"unknown"),hash("account",email),window
    ]);
    if(limits.rows.some(x=>x.attempts>(x.key_hash===hash("account",email)?10:30))){
      res.setHeader("Retry-After","900");return res.status(429).json({error:"Try again later"});
    }
    const q=await pool.query(`SELECT id,tenant_id,user_id,email,password_hash,is_admin,
      enabled,credential_version FROM mail_login_users WHERE email=$1`,[email]);
    const user=q.rows[0];
    const valid=await verifyMailPassword(password,user?.password_hash);
    if(!valid || !user?.enabled)return res.status(401).json({error:"Invalid email or password"});
    const token=randomBytes(32).toString("hex");
    const c=await pool.connect();
    try{
      await c.query("BEGIN");
      // Recheck and lock identity against concurrent disable/password reset.
      const current=await c.query(`SELECT id FROM mail_login_users WHERE id=$1 AND enabled=true
        AND credential_version=$2 FOR UPDATE`,[user.id,user.credential_version]);
      if(!current.rowCount){await c.query("ROLLBACK");return res.status(401).json({error:"Invalid email or password"});}
      const old=tokenFrom(req);
      if(old)await c.query("DELETE FROM mail_login_sessions WHERE token_hash=$1",[hash("session",old)]);
      await c.query(`DELETE FROM mail_login_sessions WHERE login_id=$1 AND token_hash IN
        (SELECT token_hash FROM mail_login_sessions WHERE login_id=$1 ORDER BY created_at DESC OFFSET 4)`,[user.id]);
      await c.query(`INSERT INTO mail_login_sessions(token_hash,login_id,credential_version,expires_at)
        VALUES($1,$2,$3,$4)`,[hash("session",token),user.id,user.credential_version,new Date(Date.now()+TTL)]);
      await c.query("DELETE FROM mail_login_sessions WHERE expires_at<now()");
      await c.query("DELETE FROM mail_login_limits WHERE window_start<now()-interval '1 day'");
      await c.query("COMMIT");
    }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
    res.setHeader("Set-Cookie",`${MAIL_COOKIE}=${token}; ${COOKIE}; Max-Age=${TTL/1000}`);
    return res.json({authenticated:true,email:user.email,admin:user.is_admin});
  }));
  app.post("/api/mail-auth/logout",wrap(async(req,res)=>{
    const token=tokenFrom(req);
    if(token)await pool.query("DELETE FROM mail_login_sessions WHERE token_hash=$1",[hash("session",token)]);
    res.setHeader("Set-Cookie",`${MAIL_COOKIE}=; ${COOKIE}; Max-Age=0`);
    res.json({authenticated:false});
  }));
  const authenticate=async(req:Request,res:Response,next:NextFunction)=>{
    // Provider webhooks authenticate their own raw body; never require a browser cookie.
    if(req.path==="/inbound" || req.path==="/provider/resend/webhook")return next();
    const token=tokenFrom(req);
    if(!token)return res.status(401).json({error:"Authentication required"});
    try{
      const q=await pool.query(`SELECT u.tenant_id,u.user_id,u.email,u.is_admin FROM mail_login_sessions s
        JOIN mail_login_users u ON u.id=s.login_id AND u.credential_version=s.credential_version
        WHERE s.token_hash=$1 AND s.expires_at>now() AND u.enabled=true`,[hash("session",token)]);
      const u=q.rows[0];if(!u)return res.status(401).json({error:"Authentication required"});
      (req as any).session={userType:u.is_admin?"merchant":"supervisor",userId:u.user_id,merchantId:u.tenant_id};
      res.locals.mailIdentity={email:u.email,admin:u.is_admin};next();
    }catch{return res.status(503).json({error:"Mail authentication unavailable"});}
  };
  app.get("/api/mail-auth/session",authenticate,(_req,res)=>res.json({authenticated:true,...res.locals.mailIdentity}));
  app.use("/api/mail",authenticate);
}
