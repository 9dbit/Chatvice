import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,stat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {prepareArchivedMessage,buildMailImportPlan,sealMailImportPlan} from './mail-import-plan.mjs';
import {readMailArchiveV2} from './mail-archive-v2.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const mailbox='one@example.invalid';
const head=['From: Sender <sender@example.invalid>','To: One <one@example.invalid>','Cc: copy@example.invalid','Bcc: hidden@example.invalid','Subject: =?UTF-8?B?SW52b2ljZSDDqQ==?=','Date: Thu, 1 Jan 2026 12:00:00 +0700','Message-ID: <one@example.invalid>','MIME-Version: 1.0'];
const raw=Buffer.from([...head,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: quoted-printable','','Private body =C3=A9'].join('\r\n'));
function record(body=raw){return {mailbox,folder:'INBOX',uid:1,date:'2026-01-01T05:01:00.000Z',flags:['\\Seen','\\Flagged','$Custom'],attachments:[],size:body.length,sha256:sha(body),object:sha('object')+'.cvmail'};}
const folder={path:'INBOX',specialUse:null};
function mimeAttachment(bytes,{filename='file.bin',type='application/octet-stream',inline=false,contentId=null}={}){
 const meta={id:'opaque',sizeBytes:bytes.length,contentType:type,filename,inline,contentId};
 return {meta,raw:Buffer.from([...head,'Content-Type: multipart/mixed; boundary="outer"','','--outer','Content-Type: text/plain; charset=utf-8','','Private body','--outer',`Content-Type: ${type}; name="${filename}"`,`Content-Disposition: ${inline?'inline':'attachment'}; filename="${filename}"`,'Content-Transfer-Encoding: base64',...(contentId?[`Content-ID: ${contentId}`]:[]),'',bytes.toString('base64'),'--outer--',''].join('\r\n'))};
}
function seal(b,key,aad){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);c.setAAD(Buffer.from(aad));const body=Buffer.concat([c.update(b),c.final()]);return Buffer.concat([Buffer.from('CVMARCH2'),iv,c.getAuthTag(),body]);}
async function archive(t,{body=raw,metadata=record(body),folderInfo=folder,stable=true,corrupt=false}={}){
 const directory=await mkdtemp(join(tmpdir(),'import-plan-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const keyHex=randomBytes(32).toString('hex'),identity=mailbox+'|'+metadata.folder+'|'+metadata.uid;
 const rec={...metadata,object:sha(identity+'|'+sha(body))+'.cvmail',aad:'source:'+identity+'|'+sha(body)};
 const manifest={version:2,total:1,bytes:body.length,source_inventory_stable:stable,
  mailboxes:[{address:mailbox,folders:[{...folderInfo,count:1}]}],records:[rec]};
 const name='manifest-'+randomUUID()+'.cvmanifest',encrypted=seal(body,keyHex,rec.aad);if(corrupt)encrypted[40]^=1;
 await writeFile(join(directory,rec.object),encrypted);await writeFile(join(directory,name),seal(Buffer.from(JSON.stringify(manifest)),keyHex,'manifest:'+name));await writeFile(join(directory,'LATEST'),name+'\n');
 return {directory,keyHex,mailboxes:[mailbox],manifest};
}
test('MIME headers, dates, unicode, BCC and original flags are preserved',async()=>{
 const row=await prepareArchivedMessage(raw,record(),folder);
 assert.equal(row.subject,'Invoice é');assert.equal(row.text,'Private body é');assert.equal(row.headerDate,'2026-01-01T05:00:00.000Z');
 assert.equal(row.receivedAt,'2026-01-01T05:01:00.000Z');assert.equal(row.isRead,true);assert.equal(row.isStarred,true);
 assert.deepEqual(row.sourceFlags,['\\Seen','\\Flagged','$Custom']);assert.equal(row.bcc[0].address,'hidden@example.invalid');
 assert.equal(row.status,'received');assert.equal(row.direction,'inbound');assert.equal(row.sourceSha256,sha(raw));
});
test('historical Sent cannot be queued or marked delivered',async()=>{
 const row=await prepareArchivedMessage(raw,{...record(),folder:'Sent'},{path:'Sent',specialUse:'\\Sent'});
 assert.equal(row.folder,'sent');assert.equal(row.direction,'outbound');assert.equal(row.status,'sent');assert.equal('deliveredAt' in row,false);
});
test('drafts remain unsent drafts',async()=>{
 const row=await prepareArchivedMessage(raw,{...record(),folder:'Drafts'},{path:'Drafts',specialUse:'\\Drafts'});assert.equal(row.status,'draft');
});
test('unknown folders require explicit mapping',async()=>{
 await assert.rejects(prepareArchivedMessage(raw,record(),{path:'Custom',specialUse:null}),/folder-unmapped/);
 assert.equal((await prepareArchivedMessage(raw,record(),{path:'Custom',specialUse:null},{Custom:'archive'})).folder,'archive');
 await assert.rejects(prepareArchivedMessage(raw,record(),{path:'Custom',specialUse:null},{Custom:'sending'}),/folder-unmapped/);
});
test('inline binary bytes are hashed exactly and stay quarantined',async()=>{
 const bytes=Buffer.from([0,128,255,13,10,99]),f=mimeAttachment(bytes,{inline:true,contentId:'<part@example.invalid>'});
 const row=await prepareArchivedMessage(f.raw,{...record(f.raw),attachments:[f.meta]},folder);
 assert.equal(row.attachments[0].sha256,sha(bytes));assert.equal(row.attachments[0].scanStatus,'pending');assert.equal(row.attachments[0].inline,true);
 assert.equal(row.attachments[0].contentId,'<part@example.invalid>');
});
test('observed legacy 8,477,526-byte attachment fits without truncation',async()=>{
 const bytes=Buffer.alloc(8_477_526,181),f=mimeAttachment(bytes);const row=await prepareArchivedMessage(f.raw,{...record(f.raw),attachments:[f.meta]},folder);
 assert.equal(row.attachments[0].sizeBytes,bytes.length);assert.equal(row.attachments[0].sha256,sha(bytes));
});
for(const field of ['sizeBytes','filename','contentType','contentId'])test('provider attachment '+field+' mismatch blocks import',async()=>{
 const f=mimeAttachment(Buffer.from('ABC')),metadata={...f.meta,[field]:field==='sizeBytes'?99:'different'};
 await assert.rejects(prepareArchivedMessage(f.raw,{...record(f.raw),attachments:[metadata]},folder),/attachment-mismatch/);
});
test('missing provider attachment metadata is not silently ignored',async()=>{
 const f=mimeAttachment(Buffer.from('ABC'));await assert.rejects(prepareArchivedMessage(f.raw,record(f.raw),folder),/attachment-mismatch/);
});
test('zero-size attachments remain archived but block application policy',async()=>{
 const f=mimeAttachment(Buffer.alloc(0));await assert.rejects(prepareArchivedMessage(f.raw,{...record(f.raw),attachments:[f.meta]},folder),/attachment-policy/);
});
for(const [field,value,reason] of [['date','not-a-date','metadata-date'],['flags','\\Seen','metadata-flags'],['attachments',null,'metadata-attachments']])test('invalid '+field+' blocks import',async()=>{
 await assert.rejects(prepareArchivedMessage(raw,{...record(),[field]:value},folder),new RegExp(reason));
});
test('ready plan remains explicit about unperformed writes/scans/offsite backup',async t=>{
 const f=await archive(t),{summary,plan}=await buildMailImportPlan(f);
 assert.equal(summary.ready,true);assert.equal(summary.planned,1);assert.equal(summary.messages,1);assert.equal(plan.rows[0].sourceFolder,'INBOX');
 for(const field of ['databaseImported','mailSent','attachmentsScanned','independentOffsiteCopy'])assert.equal(summary[field],false);
 assert.equal(JSON.stringify(summary).includes('Private body'),false);assert.equal(JSON.stringify(summary).includes('hidden@'),false);
});
test('unstable original inventory prevents readiness',async t=>{
 const f=await archive(t,{stable:false});assert.equal((await buildMailImportPlan(f)).summary.ready,false);
});
test('corrupt archive fails before any source is returned',async t=>{
 const f=await archive(t,{corrupt:true});await assert.rejects(readMailArchiveV2(f));await assert.rejects(buildMailImportPlan(f));
});
test('bad message metadata produces explicit blocked plan without skipping it',async t=>{
 const f=await archive(t,{metadata:{...record(),date:'invalid'}}),{summary,plan}=await buildMailImportPlan(f);
 assert.equal(summary.ready,false);assert.equal(summary.blocked,1);assert.equal(summary.planned,0);assert.equal(plan.blocked.length,1);
 assert.deepEqual(summary.blockedReasons,{'metadata-date':1});
});
test('encrypted plan is private, verified, idempotent and rejects conflicting replacement',async t=>{
 const f=await archive(t),{plan}=await buildMailImportPlan(f),one=await sealMailImportPlan({...f,plan}),two=await sealMailImportPlan({...f,plan});
 assert.equal(one.encryptedPlanSha256,two.encryptedPlanSha256);assert.equal(two.reused,true);
 const file=join(f.directory,one.name),data=await readFile(file);assert.equal(data.includes(Buffer.from('Private body')),false);assert.equal((await stat(file)).mode&0o777,0o600);
 const changed=structuredClone(plan);changed.rows[0].text='changed';await assert.rejects(sealMailImportPlan({...f,plan:changed}),/plan-existing-conflict/);
 data[data.length-1]^=1;await writeFile(file,data);await assert.rejects(sealMailImportPlan({...f,plan}));
});
test('wrong archive key and symlink plan destination are refused',async t=>{
 const f=await archive(t),{plan}=await buildMailImportPlan(f),saved=await sealMailImportPlan({...f,plan});
 await assert.rejects(sealMailImportPlan({...f,keyHex:randomBytes(32).toString('hex'),plan}));
 const file=join(f.directory,saved.name),external=join(f.directory,'other');await writeFile(external,await readFile(file));await rm(file);await symlink(external,file);
 await assert.rejects(sealMailImportPlan({...f,plan}));
});
test('CLI emits only aggregate evidence, not mail content or secret values',async t=>{
 const f=await archive(t);const r=spawnSync(process.execPath,['scripts/mail-import-plan.mjs'],{encoding:'utf8',env:{...process.env,MAIL_ARCHIVE_DIRECTORY:f.directory,MAIL_ARCHIVE_KEY:f.keyHex,MAIL_ARCHIVE_MAILBOXES:JSON.stringify(f.mailboxes)}});
 assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.equal(out.ready,true);
 for(const privateText of ['Private body','hidden@example.invalid',f.keyHex])assert.equal((r.stdout+r.stderr).includes(privateText),false);
});
