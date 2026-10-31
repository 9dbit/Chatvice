/** Offline pre-import validation. Produces an encrypted plan, never database writes or sends. */
import {createHash,createCipheriv,createDecipheriv,randomBytes,randomUUID,hkdfSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {open,link,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readMailArchiveV2,verifyMailArchiveV2} from './mail-archive-v2.mjs';
const require=createRequire(new URL('../config/mail-migration-runtime/package.json',import.meta.url));
const {simpleParser}=require('mailparser');
const sha=b=>createHash('sha256').update(b).digest('hex');
const demand=(ok,code)=>{if(!ok)throw Error(code);};
const MAX_BODY=4_000_000,MAX_FILE=16*1024*1024,MAX_FILES=8;
const MAGIC=Buffer.from('CVMPLAN1');
const allowedFolders=new Set(['inbox','sent','drafts','archive','spam','trash']);
const specialFolders=new Map([['\\inbox','inbox'],['\\sent','sent'],['\\drafts','drafts'],['\\archive','archive'],['\\junk','spam'],['\\spam','spam'],['\\trash','trash']]);
const reasons=new Set(['folder-unmapped','metadata-date','metadata-flags','metadata-attachments','attachment-mismatch','attachment-policy','message-sender','message-recipients','message-body-limit','mime-parse']);
function targetFolder(folder,mapping){
  const special=Array.isArray(folder.specialUse)?folder.specialUse:[folder.specialUse];
  const values=new Set(special.map(x=>specialFolders.get(String(x).toLowerCase())).filter(Boolean));
  if(values.size===1)return [...values][0];
  demand(values.size===0,'folder-unmapped');
  if(folder.path.toLowerCase()==='inbox')return 'inbox';
  const mapped=Object.hasOwn(mapping,folder.path)?mapping[folder.path]:null;
  demand(allowedFolders.has(mapped),'folder-unmapped');return mapped;
}
function addresses(value){
  const result=[];
  function visit(items,depth=0){
    demand(depth<=8&&Array.isArray(items),'message-recipients');
    for(const item of items){
      if(item.group){visit(item.group,depth+1);continue;}
      const address=typeof item.address==='string'?item.address.trim():'';
      demand(address.length<=320&&/^[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+$/.test(address),'message-recipients');
      result.push({address,name:typeof item.name==='string'?item.name:''});
      demand(result.length<=100,'message-recipients');
    }
  }
  if(value)visit(value.value);return result;
}
const cid=x=>typeof x==='string'?x.replace(/^<([^<>]*)>$/,'$1'):'';
function attachmentSignature(x){return JSON.stringify([x.sizeBytes,x.contentType.toLowerCase(),x.filename||'',cid(x.contentId)]);}
export async function prepareArchivedMessage(raw,record,folder,folderMapping={}){
  const target=targetFolder(folder,folderMapping);
  demand(typeof record.date==='string'&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(record.date)&&Number.isFinite(Date.parse(record.date)),'metadata-date');
  demand(Array.isArray(record.flags)&&record.flags.every(f=>typeof f==='string'&&f.length<=128),'metadata-flags');
  demand(Array.isArray(record.attachments)&&record.attachments.every(a=>Number.isSafeInteger(a.sizeBytes)&&a.sizeBytes>=0&&typeof a.contentType==='string'&&(a.filename==null||typeof a.filename==='string')&&(a.contentId==null||typeof a.contentId==='string')),'metadata-attachments');
  let parsed;
  try{parsed=await simpleParser(raw,{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true,skipTextLinks:true,keepDeliveryStatus:true,checksumAlgo:'sha256'});}
  catch{throw Error('mime-parse');}
  const from=addresses(parsed.from),to=addresses(parsed.to),cc=addresses(parsed.cc),bcc=addresses(parsed.bcc),replyTo=addresses(parsed.replyTo);
  demand(from.length===1||(target==='drafts'&&from.length===0),'message-sender');
  const sender=from[0]?.address||record.mailbox;
  const subject=parsed.subject||'',text=parsed.text||'',html=typeof parsed.html==='string'?parsed.html:null;
  demand([subject,text,html||''].every(s=>Buffer.byteLength(s)<=MAX_BODY),'message-body-limit');
  const attachments=parsed.attachments.map((a,index)=>({index,filename:a.filename??null,contentType:a.contentType,
    contentId:a.contentId??null,inline:a.contentDisposition==='inline',sizeBytes:a.content.length,sha256:sha(a.content),scanStatus:'pending'}));
  demand(attachments.length===record.attachments.length&&JSON.stringify(attachments.map(attachmentSignature).sort())===JSON.stringify(record.attachments.map(attachmentSignature).sort()),'attachment-mismatch');
  // Over-budget originals remain intact in the archive. No attachment is silently skipped.
  demand(attachments.length<=MAX_FILES&&attachments.every(a=>a.sizeBytes>0&&a.sizeBytes<=MAX_FILE)&&attachments.reduce((n,a)=>n+a.sizeBytes,0)<=MAX_FILE,'attachment-policy');
  const identity=sha(record.mailbox+'|'+record.folder+'|'+record.uid);
  const outbound=target==='sent'||target==='drafts'||(!['inbox','spam'].includes(target)&&sender.toLowerCase()===record.mailbox.toLowerCase());
  const result={sourceIdentity:identity,sourceEventId:'hostinger-v2:'+identity,mailbox:record.mailbox,sourceObject:record.object,sourceSha256:record.sha256,
    sourceFolder:record.folder,sourceUid:record.uid,sourceDate:record.date,sourceFlags:[...record.flags],
    providerAttachments:record.attachments,folder:target,direction:outbound?'outbound':'inbound',
    status:target==='drafts'?'draft':outbound?'sent':'received',isRead:record.flags.includes('\\Seen'),isStarred:record.flags.includes('\\Flagged'),
    receivedAt:new Date(record.date).toISOString(),headerDate:parsed.date instanceof Date&&!Number.isNaN(+parsed.date)?parsed.date.toISOString():null,
    rfcMessageId:parsed.messageId||null,inReplyTo:parsed.inReplyTo||null,references:parsed.references||[],
    fromEmail:sender,from,to,cc,bcc,replyTo,subject,text,html,attachments};
  for(const a of parsed.attachments)a.content.fill(0);
  return result;
}
export async function buildMailImportPlan(options){
  const {report,manifest,sources}=await readMailArchiveV2(options);
  const rows=[],blocked=[],blockedReasons={},folderCounts={},statusCounts={};let attachments=0,attachmentBytes=0,read=0,starred=0;
  try{
    for(const record of manifest.records){
      try{
        const folder=manifest.mailboxes.find(b=>b.address===record.mailbox).folders.find(f=>f.path===record.folder);
        const row=await prepareArchivedMessage(sources.get(record.object),record,folder,options.folderMapping||{});
        rows.push(row);folderCounts[row.folder]=(folderCounts[row.folder]||0)+1;statusCounts[row.status]=(statusCounts[row.status]||0)+1;
        attachments+=row.attachments.length;attachmentBytes+=row.attachments.reduce((n,a)=>n+a.sizeBytes,0);read+=Number(row.isRead);starred+=Number(row.isStarred);
      }catch(error){
        const reason=reasons.has(error.message)?error.message:'mime-parse';
        blockedReasons[reason]=(blockedReasons[reason]||0)+1;
        blocked.push({sourceObject:record.object,sourceSha256:record.sha256,reason});
      }
    }
    // Bind the plan to an unchanged, fully verified source snapshot.
    const after=await verifyMailArchiveV2(options);
    demand(after.encryptedManifestSha256===report.encryptedManifestSha256,'archive-snapshot-changed');
    const ready=blocked.length===0&&report.sourceInventoryStable;
    const summary={result:'mail-import-plan-completed',ready,messages:report.messages,planned:rows.length,blocked:blocked.length,blockedReasons,
      sourceBytes:report.bytes,attachments,attachmentBytes,folderCounts,statusCounts,read,starred,
      sourceInventoryStable:report.sourceInventoryStable,encryptedManifestSha256:report.encryptedManifestSha256,
      databaseImported:false,mailSent:false,attachmentsScanned:false,independentOffsiteCopy:false};
    return {summary,plan:{version:1,parser:'mailparser@3.14.1',manifestSha256:report.encryptedManifestSha256,summary,rows,blocked}};
  }finally{for(const source of sources.values())source.fill(0);sources.clear();}
}
function planKey(keyHex){
  demand(typeof keyHex==='string'&&/^[a-f0-9]{64}$/.test(keyHex),'plan-key');
  const master=Buffer.from(keyHex,'hex');
  try{return Buffer.from(hkdfSync('sha256',master,Buffer.from('chatvice-mail-import-plan-v1'),Buffer.from('plan-encryption'),32));}
  finally{master.fill(0);}
}
function openPlan(buffer,key,aad){
  demand(buffer.length>=36&&buffer.subarray(0,8).equals(MAGIC),'plan-envelope');
  const d=createDecipheriv('aes-256-gcm',key,buffer.subarray(8,20));d.setAAD(Buffer.from(aad));d.setAuthTag(buffer.subarray(20,36));
  return Buffer.concat([d.update(buffer.subarray(36)),d.final()]);
}
async function readPlanFile(file){
  const f=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const stat=await f.stat();demand(stat.isFile()&&stat.size<=64*1024*1024,'plan-size');
    const chunks=[];let size=0;for await(const c of f.createReadStream({autoClose:false})){size+=c.length;demand(size<=64*1024*1024,'plan-size');chunks.push(c);}return Buffer.concat(chunks,size);
  }finally{await f.close();}
}
export async function sealMailImportPlan({directory,keyHex,plan}){
  demand(/^[0-9a-f]{64}$/.test(plan.manifestSha256),'plan-manifest');
  const name='import-plan-'+plan.manifestSha256+'.cvmplan',target=join(resolve(directory),name),aad='plan:'+plan.manifestSha256,key=planKey(keyHex);
  const plain=Buffer.from(JSON.stringify(plan));demand(plain.length<=60*1024*1024,'plan-size');
  const verify=async()=>{const b=await readPlanFile(target),decoded=openPlan(b,key,aad);try{demand(sha(decoded)===sha(plain),'plan-existing-conflict');return sha(b);}finally{decoded.fill(0);}};
  const temp=join(resolve(directory),'.import-plan-'+randomUUID()+'.tmp');let created=false;
  try{
    try{return {name,encryptedPlanSha256:await verify(),reused:true};}catch(error){if(error.code!=='ENOENT')throw error;}
    const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(aad));const body=Buffer.concat([c.update(plain),c.final()]);
    const bytes=Buffer.concat([MAGIC,iv,c.getAuthTag(),body]);
    const f=await open(temp,'wx',0o600);created=true;try{await f.writeFile(bytes);await f.sync();}finally{await f.close();}
    // Hard link publishes atomically without replacing an existing plan.
    try{await link(temp,target);}catch(error){if(error.code!=='EEXIST')throw error;}
    return {name,encryptedPlanSha256:await verify(),reused:false};
  }finally{plain.fill(0);key.fill(0);if(created)await unlink(temp).catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const options={directory:process.env.MAIL_ARCHIVE_DIRECTORY,keyHex:process.env.MAIL_ARCHIVE_KEY,
      mailboxes:JSON.parse(process.env.MAIL_ARCHIVE_MAILBOXES||'null'),folderMapping:JSON.parse(process.env.MAIL_IMPORT_FOLDER_MAPPING||'{}')};
    const {summary,plan}=await buildMailImportPlan(options),sealed=await sealMailImportPlan({...options,plan});
    console.log(JSON.stringify({...summary,...sealed}));if(!summary.ready)process.exitCode=2;
  }catch{console.error(JSON.stringify({result:'blocked',reason:'mail-import-plan-failed'}));process.exitCode=1;}
}
