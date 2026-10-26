import express, { type Request, type Response, type NextFunction } from "express";
import { authenticateQaHeaders, issueQaSessionCookie } from "./qa-auth";
import { resolve } from "node:path";
import { pool } from "../db";
import { isMailEncryptionReady } from "./crypto";
import { registerMailRoutes } from "./routes";
import {runMailQaSmoke} from "./qa-smoke";

/**
 * Dedicated isolated preview. NOT the regular Chatvice app; no marketing pixel,
 * global uploads, customer imports, legacy background jobs, or production routes.
 *
 * QA has a single synthetic merchant and is protected by strong HTTP Basic auth.
 * Live mail provider send, AI, and legacy migration remain disabled.
 */
const qaRole=process.env.CHATVICE_MAIL_QA_ROLE;
const envName=(process.env.RAILWAY_ENVIRONMENT_NAME||"").toLowerCase();
const secret=process.env.CHATVICE_MAIL_QA_TOKEN || "";
const basicPasswordHash=process.env.CHATVICE_MAIL_QA_BASIC_PASSWORD_HASH || "";
if(qaRole!=="isolated-chatvice-mail" || envName!=="cutover-staging" ||
   !/^[0-9a-f]{64}$/i.test(secret) ||
   !/^scrypt1\.[0-9a-f]{32}\.[0-9a-f]{64}$/i.test(basicPasswordHash) ||
   !process.env.DATABASE_URL ||
   !isMailEncryptionReady() || process.env.CHATVICE_MAIL_ENABLED!=="true" ||
   process.env.CHATVICE_MAIL_OUTBOUND_ENABLED==="true" ||
   process.env.CHATVICE_MAIL_AI_ENABLED==="true") {
  throw new Error("Mail QA refuses startup: isolated staging guards or encryption are missing");
}
const app=express();
app.disable("x-powered-by");
app.set("trust proxy",1);
app.use((_req,res,next)=>{
 res.setHeader("Cache-Control","private, no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow,noarchive,nosnippet");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Referrer-Policy","no-referrer");
 res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
 res.setHeader("Cross-Origin-Opener-Policy","same-origin");
 res.setHeader("Cross-Origin-Resource-Policy","same-origin");
 next();
});
// Per-proxy-client failed-authentication limit protects the scrypt verifier.
const authFailures=new Map<string,{count:number;until:number}>();
async function requireQA(req:Request,res:Response,next:NextFunction):Promise<void>{
  const key=req.ip||req.socket.remoteAddress||"unknown",now=Date.now();
  const previous=authFailures.get(key);
  if(previous && previous.until>now && previous.count>=12){
    res.setHeader("Retry-After","60");
    res.status(429).json({error:"Too many QA login attempts"});
    return;
  }
  try{
    const auth=await authenticateQaHeaders({
      authorization:req.get("authorization"),cookie:req.get("cookie")
    },secret,basicPasswordHash,now);
    if(!auth){
      if(authFailures.size>4096){
        for(const [ip,state] of Array.from(authFailures.entries())){
          if(state.until<=now)authFailures.delete(ip);
        }
        if(authFailures.size>4096)authFailures.clear();
      }
      const count=previous&&previous.until>now?previous.count+1:1;
      authFailures.set(key,{count,until:now+60000});
      res.setHeader("WWW-Authenticate",'Basic realm="Chatvice Mail Isolated QA", charset="UTF-8"');
      res.status(401).json({error:"QA authorization required"});
      return;
    }
    authFailures.delete(key);
    // Browser Basic auth is exchanged once for a short-lived HttpOnly cookie.
    // This prevents repeat login prompts on /api/mail/ and asset requests.
    if(auth==="basic")res.setHeader("Set-Cookie",issueQaSessionCookie(secret,now));
    (req as any).session={
      userType:"merchant",userId:"qa_mail_merchant",merchantId:"qa_mail_merchant"
    };
    next();
  }catch{
    res.status(503).json({error:"QA authentication temporarily unavailable"});
  }
}
let smokeStatus="disabled";
async function qaHealth(_req:Request,res:Response){
 try{
  const q=await pool.query("SELECT id FROM chatvice_mail_qa_bootstrap WHERE id=1");
  res.status(q.rowCount===1?200:503).json({
   status:q.rowCount===1?"ok":"not_initialized",service:"chatvice-mail-qa",smoke:smokeStatus
  });
 }catch{res.status(503).json({status:"unavailable",service:"chatvice-mail-qa"});}
}
app.get("/health",qaHealth);
app.get("/__health",qaHealth);
app.use(express.json({
 limit:"2mb",
 verify:(req,_res,buf)=>{req.rawBody=Buffer.from(buf);}
}));
app.use("/api/mail",requireQA);
registerMailRoutes(app);

const csp=[
 "default-src 'none'","base-uri 'none'","object-src 'none'",
 "script-src 'self'","style-src 'self' 'unsafe-inline'",
 "connect-src 'self'","img-src 'self' data:",
 "font-src 'self' data:","frame-ancestors 'none'","form-action 'self'"
].join("; ");
const assetPath=resolve("dist/mail-qa/assets");
// Public static bundles contain no secrets. Keep HTML and APIs authenticated.
app.use("/assets",(_req,res,next)=>{res.setHeader("Content-Security-Policy",csp);next();},
 express.static(assetPath,{index:false,immutable:false,maxAge:0,etag:false}));
app.get(["/","/dashboard/mail","/dashboard/mail/admin"],requireQA,(req,res)=>{
 res.setHeader("Content-Security-Policy",csp);
 if(req.path==="/")return res.redirect(302,"/dashboard/mail");
 res.sendFile(resolve("dist/mail-qa/mail-qa.html"));
});
app.use((_req,res)=>res.sendStatus(404));
const port=Number(process.env.PORT||"5000");
const server=app.listen(port,"0.0.0.0",()=>{
 console.log("[Mail QA] isolated preview server listening");
 if(process.env.CHATVICE_MAIL_QA_SMOKE==="true"){
  smokeStatus="running";
  void runMailQaSmoke(port).then(result=>{
   smokeStatus="passed";console.log("[Mail QA smoke] "+JSON.stringify({status:"passed",...result}));
  }).catch(error=>{
   smokeStatus="failed";
   console.warn("[Mail QA smoke] "+JSON.stringify({status:"failed",check:error instanceof Error?error.message:"unknown"}));
  });
 }
});
function shutdown(){server.close(()=>pool.end().finally(()=>process.exit(0)));}
process.once("SIGTERM",shutdown);
process.once("SIGINT",shutdown);

