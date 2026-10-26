import {randomUUID} from "node:crypto";
/** Real private storage/scanner smoke, synthetic QA only. Never queue delivery. */
export async function runMailQaSmoke(port:number):Promise<{checks:number}> {
  if(process.env.CHATVICE_MAIL_QA_ROLE!=="isolated-chatvice-mail" ||
    process.env.RAILWAY_ENVIRONMENT_NAME!=="cutover-staging" ||
    process.env.CHATVICE_MAIL_OUTBOUND_ENABLED==="true" ||
    process.env.CHATVICE_MAIL_AI_ENABLED==="true")throw new Error("QA scope guard");
  const base=`http://127.0.0.1:${port}`;
  const token=process.env.CHATVICE_MAIL_QA_TOKEN||"";
  const origins=(process.env.CHATVICE_MAIL_ALLOWED_ORIGINS||"").split(",").map(x=>x.trim());
  const origin=origins.find(x=>x==="https://chatvice-mail-qa-cutover-staging.up.railway.app");
  if(!origin || !/^[0-9a-f]{64}$/i.test(token))throw new Error("QA smoke configuration");
  let checks=0;
  const check=(valid:boolean,name:string)=>{if(!valid)throw new Error(name);checks++;};
  const call=(path:string,init:RequestInit={},authorized=true)=>fetch(base+path,{
    ...init,headers:{...(authorized?{Authorization:"Bearer "+token}:{}),Origin:origin,...init.headers},
    signal:AbortSignal.timeout(45000)
  });
  const anonymous=await call("/dashboard/mail",{},false);check(anonymous.status===401,"anonymous-ui");
  const html=await call("/dashboard/mail");check(html.status===200,"authenticated-ui");
  check((html.headers.get("content-security-policy")||"").includes("frame-ancestors 'none'"),"private-csp");
  check((html.headers.get("cache-control")||"").includes("no-store"),"private-cache");
  const markup=await html.text();check(!/googletagmanager|google-analytics|meta-pixel|fonts.googleapis.com/i.test(markup),"tracker-free-document");
  const list=await call("/api/mail/mailboxes");check(list.status===200,"mailbox-list");
  const boxes=await list.json() as {id:string;domain:string}[];
  const box=boxes.find(x=>x.domain==="qa-mail.example.invalid");check(!!box,"synthetic-mailbox-only");
  const draft=await call("/api/mail/compose",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({mailboxId:box!.id,to:["sink@qa-mail.example.invalid"],draft:true,
      subject:"QA smoke "+randomUUID(),text:"Synthetic private attachment check; never send."})});
  check(draft.status===201,"draft-created");
  const message=await draft.json() as {id:string};
  const bytes=Buffer.from("Chatvice private QA attachment "+randomUUID());
  const upload=async(value:Buffer,name:string)=>{
    const data=new FormData();data.set("file",new Blob([new Uint8Array(value)],{type:"text/plain"}),name);
    return call(`/api/mail/messages/${message.id}/attachments`,{method:"POST",body:data});
  };
  const clean=await upload(bytes,"safe-qa.txt");check(clean.status===201,"safe-upload");
  const safe=await clean.json() as {id:string;scanStatus:string};check(safe.scanStatus==="clean","live-clamav-clean");
  const downloaded=await call(`/api/mail/attachments/${safe.id}/download`);check(downloaded.status===200,"safe-authorized-download");
  check(Buffer.from(await downloaded.arrayBuffer()).equals(bytes),"private-storage-byte-roundtrip");
  const denied=await call(`/api/mail/attachments/${safe.id}/download`,{},false);check(denied.status===401,"anonymous-download-denied");
  const eicar=Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
  const malware=await upload(eicar,"eicar-qa.txt");check(malware.status===201,"eicar-upload-registered");
  const blocked=await malware.json() as {id:string;scanStatus:string};check(blocked.scanStatus==="blocked","live-clamav-eicar-blocked");
  const refused=await call(`/api/mail/attachments/${blocked.id}/download`);check(refused.status===410,"blocked-download-denied");
  const send=await call(`/api/mail/drafts/${message.id}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  check(send.status===503,"outbound-disabled");
  return {checks};
}
