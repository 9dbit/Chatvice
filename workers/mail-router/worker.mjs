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
    // Keep hello's original transport for normal messages. Resend's SMTP
    // receiver rejects some otherwise authenticated messages (e.g. Dreamina)
    // with 5.2.3 line too long; preserve the MIME bytes over authenticated HTTPS.
    if(recipient==="hello@chatvice.app"){
      // Capture before forward: the raw MIME stream is single-use.
      if(message.rawSize>25*1024*1024)throw new Error("Raw mail exceeds inbound limit");
      const raw=await new Response(message.raw).arrayBuffer();
      if(!raw.byteLength||raw.byteLength>25*1024*1024)throw new Error("Invalid raw mail size");
      try{
        await message.forward("hello-route@qa-mail-staging.chatvice.app");
        return;
      }catch(error){
        if(!/line too long/i.test(String(error?.message||error)))throw error;
      }
      for(let attempt=0;attempt<2;attempt++){
        try{
          const response=await fetch(env.CHATVICE_MAIL_APP_ORIGIN+"/api/mail/router/raw",{
            method:"POST",headers:{"Authorization":"Bearer "+env.CHATVICE_MAIL_ROUTER_SECRET,
              "Content-Type":"message/rfc822","X-Chatvice-Recipient":recipient},
            body:raw,redirect:"error",signal:AbortSignal.timeout(25000)
          });
          if(response.ok&&(await response.json()).accepted===true)return;
        }catch{ /* Retry once; never acknowledge mail that was not stored. */ }
      }
      throw new Error("Raw mail delivery unavailable");
    }
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
