// Cloudflare Email Worker. Secrets are bindings, never source-code constants.
// Existing exact-address rules keep precedence over this domain catch-all.
const encoder=new TextEncoder();
const header="X-Chatvice-Route-V1";
export default {
  async email(message,env){
    if(!/^[0-9a-f]{64}$/i.test(env.CHATVICE_MAIL_ROUTER_SECRET||"")||
      !/^https:\/\/[a-z0-9.-]+$/.test(env.CHATVICE_MAIL_APP_ORIGIN||"")||
      !/^[a-z0-9._+-]+@[a-z0-9.-]+$/.test(env.CHATVICE_MAIL_ROUTER_FORWARD_TO||""))throw new Error("Router configuration unavailable");
    const recipient=message.to.trim().toLowerCase();
    const domains=(env.CHATVICE_MAIL_ROUTER_DOMAINS||"").split(",").map(x=>x.trim().toLowerCase());
    if(!domains.includes(recipient.split("@")[1]))return message.setReject("Unknown mail domain");
    // Never allow an incoming sender to smuggle a second routing envelope.
    if(message.headers.has(header))return message.setReject("Reserved mail routing header");
    let lookup;
    try{
      lookup=await fetch(env.CHATVICE_MAIL_APP_ORIGIN+"/api/mail/router/recipient",{
        method:"POST",headers:{"Authorization":"Bearer "+env.CHATVICE_MAIL_ROUTER_SECRET,"Content-Type":"application/json"},
        body:JSON.stringify({address:recipient}),redirect:"error",signal:AbortSignal.timeout(5000)
      });
    }catch{ /* Preserve mail in Resend during an app outage; its webhook will retry. */ }
    if(lookup?.status===404)return message.setReject("Mailbox does not exist or is disabled");
    if(lookup?.status===401||lookup?.status===403)throw new Error("Router authentication unavailable");
    const envelope={v:1,to:recipient,mid:message.headers.get("message-id")||"",id:crypto.randomUUID(),ts:Date.now()};
    const bytes=encoder.encode(JSON.stringify(envelope));
    const payload=btoa(String.fromCharCode(...bytes)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
    const key=await crypto.subtle.importKey("raw",encoder.encode(env.CHATVICE_MAIL_ROUTER_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const signature=Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(payload)))).map(x=>x.toString(16).padStart(2,"0")).join("");
    await message.forward(env.CHATVICE_MAIL_ROUTER_FORWARD_TO,new Headers({[header]:payload+"."+signature}));
  },
  async fetch(){return new Response("Chatvice Mail router",{status:200,headers:{"Cache-Control":"no-store"}});}
};
