/** Read-only CVMARCH2 recovery. No network, DB writes or plaintext CLI output. */
import {createDecipheriv, createHash} from 'node:crypto';
import {open, lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const magic=Buffer.from('CVMARCH2');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const MAX_SOURCE=32*1024*1024, MAX_TOTAL=60*1024*1024, MAX_RECORDS=5000;
const demand=(ok,code)=>{if(!ok)throw Error(code);};

async function readBounded(directory,name,limit){
  demand(!name.includes('/')&&!name.includes('\\')&&name!=='.'&&name!=='..','archive-path');
  const file=await open(join(directory,name),constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const stat=await file.stat();
    demand(stat.isFile()&&stat.size<=limit,'archive-file-limit');
    const chunks=[];let bytes=0;
    for await(const chunk of file.createReadStream({autoClose:false})){
      bytes+=chunk.length;demand(bytes<=limit,'archive-file-limit');chunks.push(chunk);
    }
    return Buffer.concat(chunks,bytes);
  }finally{await file.close();}
}

function decrypt(bytes,key,aad){
  demand(bytes.length>=36&&bytes.subarray(0,8).equals(magic),'archive-envelope');
  const cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(8,20));
  cipher.setAAD(Buffer.from(aad));cipher.setAuthTag(bytes.subarray(20,36));
  return Buffer.concat([cipher.update(bytes.subarray(36)),cipher.final()]);
}

async function readArchive({directory,keyHex,mailboxes},collectSources=false){
  demand(typeof directory==='string'&&directory.length>0,'archive-directory');
  demand(typeof keyHex==='string'&&/^[a-f0-9]{64}$/.test(keyHex),'archive-key');
  demand(Array.isArray(mailboxes)&&mailboxes.length>0&&mailboxes.length<=100&&
    mailboxes.every(x=>typeof x==='string'&&/^[^\s@|]+@[^\s@|]+$/.test(x))&&
    new Set(mailboxes).size===mailboxes.length,'archive-mailboxes');
  const root=resolve(directory),key=Buffer.from(keyHex,'hex');
  try{
    // An incomplete run has no accepted snapshot to restore.
    try{await lstat(join(root,'running.lock'));throw Error('archive-running');}
    catch(error){if(error.code!=='ENOENT')throw error;}
    const pointer=(await readBounded(root,'LATEST',100)).toString('utf8');
    demand(/^manifest-[a-f0-9-]{36}\.cvmanifest\n?$/.test(pointer),'archive-manifest-name');
    const name=pointer.trim();
    const encryptedManifest=await readBounded(root,name,8*1024*1024);
    const manifest=JSON.parse(decrypt(encryptedManifest,key,'manifest:'+name).toString('utf8'));
    demand(manifest.version===2&&Array.isArray(manifest.records)&&
      Number.isSafeInteger(manifest.total)&&manifest.total>=0&&manifest.total<=MAX_RECORDS&&
      manifest.total===manifest.records.length&&Number.isSafeInteger(manifest.bytes)&&
      manifest.bytes>=0&&manifest.bytes<=MAX_TOTAL&&
      typeof manifest.source_inventory_stable==='boolean','archive-manifest');
    demand(Array.isArray(manifest.mailboxes)&&manifest.mailboxes.length===mailboxes.length&&
      new Set(manifest.mailboxes.map(b=>b.address)).size===mailboxes.length&&
      manifest.mailboxes.every(b=>mailboxes.includes(b.address)&&Array.isArray(b.folders)),
      'archive-mailbox-scope');
    const declared=new Map(),actual=new Map(),counts=Object.fromEntries(mailboxes.map(x=>[x,0]));
    for(const box of manifest.mailboxes)for(const folder of box.folders){
      demand(typeof folder.path==='string'&&folder.path.length>0&&folder.path.length<=1024&&
        !folder.path.includes('|')&&Number.isSafeInteger(folder.count)&&folder.count>=0,
        'archive-folder');
      const scope=box.address+'|'+folder.path;
      demand(!declared.has(scope),'archive-duplicate-folder');declared.set(scope,folder.count);
    }
    const identities=new Set(),objects=new Set(),sources=new Map();let bytes=0;
    for(const record of manifest.records){
      demand(mailboxes.includes(record.mailbox)&&typeof record.folder==='string'&&
        declared.has(record.mailbox+'|'+record.folder)&&Number.isSafeInteger(record.uid)&&
        record.uid>0&&Number.isSafeInteger(record.size)&&record.size>0&&record.size<=MAX_SOURCE&&
        typeof record.sha256==='string'&&/^[a-f0-9]{64}$/.test(record.sha256)&&
        typeof record.object==='string'&&/^[a-f0-9]{64}\.cvmail$/.test(record.object),
        'archive-record');
      const identity=record.mailbox+'|'+record.folder+'|'+record.uid;
      demand(!identities.has(identity)&&!objects.has(record.object)&&
        record.object===sha(identity+'|'+record.sha256)+'.cvmail'&&
        record.aad==='source:'+identity+'|'+record.sha256,'archive-identity');
      identities.add(identity);objects.add(record.object);
      const source=decrypt(await readBounded(root,record.object,record.size+36),key,record.aad);
      demand(source.length===record.size&&sha(source)===record.sha256,'archive-integrity');
      if(collectSources)sources.set(record.object,source);
      bytes+=source.length;demand(bytes<=MAX_TOTAL,'archive-total-limit');
      counts[record.mailbox]++;
      const scope=record.mailbox+'|'+record.folder;actual.set(scope,(actual.get(scope)||0)+1);
    }
    demand(bytes===manifest.bytes&&[...declared].every(([scope,n])=>(actual.get(scope)||0)===n),
      'archive-totals');
    // Recheck the pointer/lock after verification; a concurrently replaced snapshot is not accepted.
    demand((await readBounded(root,'LATEST',100)).toString('utf8')===pointer,'archive-snapshot-changed');
    try{await lstat(join(root,'running.lock'));throw Error('archive-running');}
    catch(error){if(error.code!=='ENOENT')throw error;}
    const report={verified:true,messages:manifest.total,bytes,mailboxCounts:counts,
      sourceInventoryStable:manifest.source_inventory_stable,
      encryptedManifestSha256:sha(encryptedManifest),
      independentOffsiteCopy:false,mailboxDatabaseImported:false};
    return collectSources?{report,manifest,sources}:report;
  }finally{key.fill(0);}
}

export const verifyMailArchiveV2=options=>readArchive(options);
// Bounded to 60 MiB. Nothing is returned until every source and the final
// snapshot pointer/lock have passed verification. Caller must clear buffers.
export const readMailArchiveV2=options=>readArchive(options,true);

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const report=await verifyMailArchiveV2({directory:process.env.MAIL_ARCHIVE_DIRECTORY,
      keyHex:process.env.MAIL_ARCHIVE_KEY,mailboxes:JSON.parse(process.env.MAIL_ARCHIVE_MAILBOXES||'null')});
    console.log(JSON.stringify(report));
  }catch{
    // Never print paths, raw mail, provider fields or secret-bearing exception messages.
    console.error(JSON.stringify({verified:false,reason:'archive-verification-failed'}));process.exitCode=1;
  }
}
