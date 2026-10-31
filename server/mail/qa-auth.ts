import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyMailPassword } from "./password";

export const QA_COOKIE_NAME="__Host-chatvice_mail_qa";
const SESSION_MS=60*60*1000;
export type QaAuthMethod="basic"|"bearer"|"session"|null;

function constantEqual(left:string,right:string):boolean{
  const a=Buffer.from(left,"utf8"),b=Buffer.from(right,"utf8");
  return a.length===b.length && timingSafeEqual(a,b);
}
function sessionSignature(secret:string,body:string):Buffer{
  // A separate browser session key is derived from the existing private QA token.
  return createHmac("sha256",Buffer.from(secret,"hex"))
    .update("chatvice-mail-qa-session-v1:").update(body).digest();
}
export function issueQaSessionCookie(secret:string,now=Date.now()):string{
  if(!/^[a-f0-9]{64}$/i.test(secret))throw new Error("QA session secret missing");
  const body=String(now+SESSION_MS)+"."+randomBytes(16).toString("hex");
  const signature=sessionSignature(secret,body).toString("hex");
  return QA_COOKIE_NAME+"="+body+"."+signature+
    "; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Strict";
}
export function verifyQaSessionCookie(cookieHeader:string|undefined,secret:string,now=Date.now()):boolean{
  if(!cookieHeader || cookieHeader.length>4096 || !/^[a-f0-9]{64}$/i.test(secret))return false;
  const entry=cookieHeader.split(";").map(s=>s.trim())
    .find(s=>s.startsWith(QA_COOKIE_NAME+"="));
  if(!entry)return false;
  const value=entry.slice(QA_COOKIE_NAME.length+1);
  const match=/^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/i.exec(value);
  if(!match)return false;
  const expires=Number(match[1]);
  if(!Number.isSafeInteger(expires) || expires<=now || expires>now+SESSION_MS)return false;
  const expected=sessionSignature(secret,match[1]+"."+match[2]);
  const actual=Buffer.from(match[3],"hex");
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
export async function authenticateQaHeaders(
  headers:{authorization?:string;cookie?:string},
  secret:string,passwordHash:string,now=Date.now(),
):Promise<QaAuthMethod>{
  if(verifyQaSessionCookie(headers.cookie,secret,now))return "session";
  const auth=headers.authorization||"";
  if(auth.startsWith("Bearer ")){
    const supplied=auth.slice("Bearer ".length);
    return constantEqual(supplied,secret)?"bearer":null;
  }
  if(!auth.startsWith("Basic ") || !/^scrypt1\.[a-f0-9]{32}\.[a-f0-9]{64}$/i.test(passwordHash))
    return null;
  const encoded=auth.slice("Basic ".length);
  if(encoded.length>700 || !/^[a-zA-Z0-9+/]+={0,2}$/.test(encoded))return null;
  let pair="";
  try{pair=Buffer.from(encoded,"base64").toString("utf8");}
  catch{return null;}
  const colon=pair.indexOf(":");
  if(colon<=0 || colon>50 || pair.slice(0,colon)!=="mailqa")return null;
  const password=pair.slice(colon+1);
  if(password.length>256)return null;
  return await verifyMailPassword(password,passwordHash)?"basic":null;
}
