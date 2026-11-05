import test from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_URL ||= "postgresql://unused@127.0.0.1:1/unused";
const {verifyRouteEnvelope}=await import("./router");
const {default:worker}=await import("../../workers/mail-router/worker.mjs");
const actual=globalThis.fetch;
const env={CHATVICE_MAIL_ROUTER_SECRET:"a".repeat(64),CHATVICE_MAIL_APP_ORIGIN:"https://mail.example.invalid",CHATVICE_MAIL_ROUTER_DOMAINS:"accounts.example.invalid",CHATVICE_MAIL_ROUTER_FORWARD_TO:"router@transport.example.invalid"};
function message(){let forwarded:any=null,rejected="";return {to:"new@accounts.example.invalid",headers:new Headers({"Message-ID":"<worker@example.invalid>"}),
  async forward(to:string,headers:Headers){forwarded={to,headers};},setReject(reason:string){rejected=reason;},result:()=>({forwarded,rejected})};}
test("worker signs the SMTP recipient for the backend and forwards only to its fixed transport",async()=>{
  const m=message();let request:any;
  globalThis.fetch=(async(url:any,init:any)=>{request={url,...init};return new Response(null,{status:204});}) as any;
  try{await worker.email(m,env);}finally{globalThis.fetch=actual;}
  assert.equal(request.url,env.CHATVICE_MAIL_APP_ORIGIN+"/api/mail/router/recipient");assert.equal(request.redirect,"error");
  assert.deepEqual(JSON.parse(request.body),{address:m.to});
  const r=m.result();assert.equal(r.rejected,"");assert.equal(r.forwarded.to,env.CHATVICE_MAIL_ROUTER_FORWARD_TO);
  assert.equal(verifyRouteEnvelope(r.forwarded.headers.get("X-Chatvice-Route-V1"),"<worker@example.invalid>",env.CHATVICE_MAIL_ROUTER_SECRET)?.to,m.to);
});
test("unknown or disabled mailbox is rejected, and supplied routing headers cannot be smuggled",async()=>{
  globalThis.fetch=(async()=>new Response(null,{status:404})) as any;
  try{const m=message();await worker.email(m,env);assert.equal(m.result().forwarded,null);assert.match(m.result().rejected,/does not exist/);
    const forged=message();forged.headers.set("X-Chatvice-Route-V1","forged");await worker.email(forged,env);assert.match(forged.result().rejected,/Reserved/);
    const foreign=message();foreign.to="outside@other.example.invalid";await worker.email(foreign,env);assert.match(foreign.result().rejected,/Unknown/);
  }finally{globalThis.fetch=actual;}
});
test("app outages preserve mail in Resend, but authentication errors never forward",async()=>{
  for(const status of [503,0]){
    globalThis.fetch=(async()=>{if(status===0)throw Error("offline");return new Response(null,{status});}) as any;
    try{const m=message();await worker.email(m,env);assert.equal(m.result().forwarded.to,env.CHATVICE_MAIL_ROUTER_FORWARD_TO);}finally{globalThis.fetch=actual;}
  }
  globalThis.fetch=(async()=>new Response(null,{status:401})) as any;
  try{const m=message();await assert.rejects(worker.email(m,env),/authentication/);assert.equal(m.result().forwarded,null);}finally{globalThis.fetch=actual;}
});
