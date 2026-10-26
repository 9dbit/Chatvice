import express from "express";
import {resolve} from "node:path";
import {pool} from "../db";
import {isMailEncryptionReady} from "./crypto";
import {registerMailLogin} from "./login";
import {registerMailRoutes} from "./routes";
import {startMailOutboxWorker} from "./outbox";
const origin=process.env.CHATVICE_MAIL_APP_ORIGIN||"";
if(process.env.CHATVICE_MAIL_APP_ROLE!=="isolated-mail" ||
   !/^https:\/\/[a-z0-9.-]+$/.test(origin) ||
   process.env.CHATVICE_MAIL_ALLOWED_ORIGINS!==origin ||
   process.env.CHATVICE_MAIL_ENABLED!=="true" || !isMailEncryptionReady() ||
   process.env.CHATVICE_MAIL_QA_BOOTSTRAP==="true" ||
   process.env.CHATVICE_MAIL_AI_ENABLED==="true")
  throw new Error("Isolated Mail application configuration required");
const app=express();
app.disable("x-powered-by");app.set("trust proxy",1);
const csp=["default-src 'none'","base-uri 'none'","object-src 'none'","script-src 'self'",
  "style-src 'self' 'unsafe-inline'","connect-src 'self'","img-src 'self' data:",
  "font-src 'self' data:","frame-ancestors 'none'","form-action 'self'"].join("; ");
app.use((_req,res,next)=>{
  res.setHeader("Cache-Control","private, no-store");
  res.setHeader("Content-Security-Policy",csp);
  res.setHeader("X-Robots-Tag","noindex,nofollow,noarchive,nosnippet");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Strict-Transport-Security","max-age=31536000");
  res.setHeader("Cross-Origin-Opener-Policy","same-origin");
  res.setHeader("Cross-Origin-Resource-Policy","same-origin");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");next();
});
app.get("/health",async(_req,res)=>{
  try{
    await pool.query("SELECT id FROM mail_login_users LIMIT 1");
    res.json({status:"ok",service:"chatvice-mail"});
  }catch{res.status(503).json({status:"unavailable",service:"chatvice-mail"});}
});
app.use(express.json({limit:"2mb",verify:(req,_res,buf)=>{req.rawBody=Buffer.from(buf)}}));
registerMailLogin(app,pool,origin,process.env.CHATVICE_MAIL_SESSION_SECRET||"");
registerMailRoutes(app);
app.use("/assets",express.static(resolve("dist/mail-app/assets"),{index:false,maxAge:0,etag:false}));
app.get(["/","/login","/dashboard/mail","/dashboard/mail/admin"],(_req,res)=>
  res.sendFile(resolve("dist/mail-app/mail-app.html")));
app.use((_req,res)=>res.sendStatus(404));
// Do not echo parser errors, multipart payloads, credentials, or provider bodies.
app.use((_err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>
  res.status(400).json({error:"Mail request could not be processed"}));
const port=Number(process.env.PORT||"5000");
const server=app.listen(port,"0.0.0.0",()=>{
  console.log("[Mail] isolated app listening");startMailOutboxWorker();
});
function shutdown(){server.close(()=>pool.end().finally(()=>process.exit(0)));}
process.once("SIGTERM",shutdown);process.once("SIGINT",shutdown);
