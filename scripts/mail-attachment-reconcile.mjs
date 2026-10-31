/** GET-only provider proof for archived attachment metadata discrepancies. */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readMailArchiveV2,verifyMailArchiveV2} from './mail-archive-v2.mjs';
import {providerMetadataSha256} from './mail-import-plan.mjs';
const require=createRequire(new URL('../config/mail-migration-runtime/package.json',import.meta.url));
const {simpleParser}=require('mailparser');
const sha=b=>createHash('sha256').update(b).digest('hex');
const demand=(ok,code)=>{if(!ok)throw Error(code);};
const metadataKey=a=>JSON.stringify([(a.filename||''),(a.contentType||'').toLowerCase(),(a.contentId||'').replace(/^<([^<>]*)>$/,'$1')]);
export function hostingerAttachmentReader({token,fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 demand(typeof token==='string'&&token.length>0,'provider-token');
 return async(route,raw=false)=>{
  demand(typeof route==='string'&&(route==='me'||/^mailboxes\/AC[a-zA-Z0-9]+\/folders\/[^/]+\/messages\/[1-9][0-9]*\/attachments\/[^/]+$/.test(route)),'provider-route');
  await wait(600);let response;
  for(let attempt=0;attempt<4;attempt++){
   response=await fetchImpl('https://api.mail.hostinger.com/api/v1/'+route,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:raw?'application/octet-stream':'application/json','User-Agent':'Chatvice-Mail-Migration/1.0'},redirect:'error',signal:AbortSignal.timeout(60000)});
   if(response.ok)break;
   if(attempt===3||![429,500,502,503,504].includes(response.status)){await response.body?.cancel();throw Error('provider-http-'+response.status);}
   const header=response.headers.get('retry-after'),seconds=header==null?0:Number(header);
   demand(Number.isFinite(seconds)&&seconds>=0&&seconds<=60,'provider-retry-limit');await response.body?.cancel();
   await wait(Math.max(2000*2**attempt,response.status===429?10000:0,seconds*1000));
  }
  const chunks=[];let bytes=0;const limit=raw?16*1024*1024:1024*1024;
  for await(const chunk of response.body){bytes+=chunk.length;demand(bytes<=limit,'provider-size');chunks.push(chunk);}
  const data=Buffer.concat(chunks,bytes);return raw?data:JSON.parse(data.toString('utf8'));
 };
}
export async function reconcileArchivedAttachments(options,readProvider){
 const {report,manifest,sources}=await readMailArchiveV2(options);const rows=[];let bytes=0;
 try{
  demand(report.sourceInventoryStable,'source-unstable');
  const total=manifest.records.reduce((n,r)=>n+(Array.isArray(r.attachments)?r.attachments.length:1001),0);demand(total<=1000,'attachment-count');
  const account=(await readProvider('me')).data.mailboxes,mailboxes=new Map();
  for(const target of options.mailboxes){const matches=account.filter(b=>typeof b.address==='string'&&b.address.toLowerCase()===target.toLowerCase());
   demand(matches.length===1&&/^AC[a-zA-Z0-9]+$/.test(matches[0].resourceId),'provider-mailbox');mailboxes.set(target,matches[0].resourceId);}
  for(const record of manifest.records){
   if(!record.attachments.length)continue;
   const parsed=await simpleParser(sources.get(record.object),{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true,skipTextLinks:true,keepDeliveryStatus:true,checksumAlgo:'sha256'});
   try{
    demand(parsed.attachments.length===record.attachments.length,'attachment-count');const used=new Set(),providerIds=new Set();
    for(const attachment of record.attachments){
     demand(typeof attachment.id==='string'&&attachment.id.length>0&&attachment.id.length<=1024&&!providerIds.has(attachment.id),'provider-attachment-id');providerIds.add(attachment.id);
     const route='mailboxes/'+mailboxes.get(record.mailbox)+'/folders/'+encodeURIComponent(record.folder)+'/messages/'+record.uid+'/attachments/'+encodeURIComponent(attachment.id);
     const downloaded=await readProvider(route,true);
     try{
      demand(Buffer.isBuffer(downloaded)&&downloaded.length<=16*1024*1024,'provider-size');bytes+=downloaded.length;demand(bytes<=60*1024*1024,'provider-total');
      const hash=sha(downloaded),matches=parsed.attachments.map((a,index)=>({a,index})).filter(({a,index})=>!used.has(index)&&metadataKey(a)===metadataKey(attachment)&&a.content.length===downloaded.length&&sha(a.content)===hash);
      demand(matches.length===1,'attachment-source-provider-mismatch');used.add(matches[0].index);
      rows.push({sourceObject:record.object,sourceSha256:record.sha256,providerAttachmentId:attachment.id,providerMetadataSha256:providerMetadataSha256(attachment),decodedSizeBytes:downloaded.length,decodedSha256:hash});
     }finally{downloaded.fill(0);}
    }
   }finally{for(const a of parsed.attachments)a.content.fill(0);}
  }
  demand(rows.length===total,'attachment-count');const after=await verifyMailArchiveV2(options);
  demand(after.encryptedManifestSha256===report.encryptedManifestSha256,'archive-snapshot-changed');
  return {version:2,kind:'attachment-reconciliation',manifestSha256:report.encryptedManifestSha256,rows,
   summary:{result:'attachment-reconciliation-completed',attachments:rows.length,decodedBytes:bytes,providerBytesMatchMime:true,providerReadOnly:true}};
 }finally{for(const raw of sources.values())raw.fill(0);sources.clear();}
}
