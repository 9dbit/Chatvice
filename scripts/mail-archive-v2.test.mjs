import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {verifyMailArchiveV2} from './mail-archive-v2.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const targets=['one@example.invalid','two@example.invalid'];
function encrypt(source,key,aad){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);
  cipher.setAAD(Buffer.from(aad));const data=Buffer.concat([cipher.update(source),cipher.final()]);
  return Buffer.concat([Buffer.from('CVMARCH2'),iv,cipher.getAuthTag(),data]);
}
async function fixture(t){
  const directory=await mkdtemp(join(tmpdir(),'mail-v2-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const keyHex=randomBytes(32).toString('hex'),name='manifest-'+randomUUID()+'.cvmanifest';
  const raw=Buffer.from([0,128,255,13,10,65]),records=[];
  for(const mailbox of targets){
    const identity=mailbox+'|INBOX|1',digest=hash(raw),object=hash(identity+'|'+digest)+'.cvmail';
    const aad='source:'+identity+'|'+digest;
    records.push({mailbox,folder:'INBOX',uid:1,size:raw.length,object,aad,sha256:digest});
    await writeFile(join(directory,object),encrypt(raw,keyHex,aad));
  }
  const manifest={version:2,total:2,bytes:raw.length*2,source_inventory_stable:true,records,
    mailboxes:targets.map(address=>({address,folders:[{path:'INBOX',count:1},{path:'Empty',count:0}]}))};
  const writeManifest=()=>writeFile(join(directory,name),encrypt(Buffer.from(JSON.stringify(manifest)),keyHex,'manifest:'+name));
  await writeManifest();await writeFile(join(directory,'LATEST'),name+'\n');
  return {directory,keyHex,name,manifest,writeManifest,
    verify:()=>verifyMailArchiveV2({directory,keyHex,mailboxes:targets})};
}

test('complete binary sources, both mailboxes and empty folders verify without plaintext output',async t=>{
  const f=await fixture(t),report=await f.verify();
  assert.equal(report.verified,true);assert.equal(report.messages,2);assert.equal(report.bytes,12);
  assert.deepEqual(report.mailboxCounts,Object.fromEntries(targets.map(x=>[x,1])));
  assert.equal(report.sourceInventoryStable,true);
  assert.equal(report.independentOffsiteCopy,false);assert.equal(report.mailboxDatabaseImported,false);
  assert.equal(report.encryptedManifestSha256,hash(await readFile(join(f.directory,f.name))));
  assert.equal('records' in report,false);assert.equal('source' in report,false);
});
test('a changing source remains explicit even when its saved snapshot is intact',async t=>{
  const f=await fixture(t);f.manifest.source_inventory_stable=false;await f.writeManifest();
  assert.equal((await f.verify()).sourceInventoryStable,false);
});
test('wrong key and altered manifest are rejected',async t=>{
  const f=await fixture(t);
  await assert.rejects(verifyMailArchiveV2({...f,keyHex:randomBytes(32).toString('hex'),mailboxes:targets}));
  const bytes=await readFile(join(f.directory,f.name));bytes[bytes.length-1]^=1;
  await writeFile(join(f.directory,f.name),bytes);await assert.rejects(f.verify());
});
test('altered source ciphertext is rejected',async t=>{
  const f=await fixture(t),name=f.manifest.records[0].object;
  const bytes=await readFile(join(f.directory,name));bytes[bytes.length-1]^=1;
  await writeFile(join(f.directory,name),bytes);await assert.rejects(f.verify());
});
test('missing source is rejected rather than skipped',async t=>{
  const f=await fixture(t);await rm(join(f.directory,f.manifest.records[0].object));
  await assert.rejects(f.verify());
});
test('a source symlink is rejected',async t=>{
  const f=await fixture(t),file=join(f.directory,f.manifest.records[0].object);
  await writeFile(join(f.directory,'external'),await readFile(file));await rm(file);
  await symlink(join(f.directory,'external'),file);await assert.rejects(f.verify());
});
test('active writer prevents acceptance',async t=>{
  const f=await fixture(t);await writeFile(join(f.directory,'running.lock'),'');
  await assert.rejects(f.verify(),/archive-running/);
});
test('pointer traversal is rejected before reading an external manifest',async t=>{
  const f=await fixture(t);await writeFile(join(f.directory,'LATEST'),'../secret\n');
  await assert.rejects(f.verify(),/archive-manifest-name/);
});
test('different expected mailbox scope is rejected',async t=>{
  const f=await fixture(t);
  await assert.rejects(verifyMailArchiveV2({...f,mailboxes:[targets[0]]}),/archive-mailbox-scope/);
});
for(const [name,mutate,reason] of [
  ['duplicate identity',m=>{m.records[1]={...m.records[0]};},'archive-identity'],
  ['modified AAD',m=>{m.records[0].aad='wrong';},'archive-identity'],
  ['object traversal',m=>{m.records[0].object='../secret';},'archive-record'],
  ['zero UID',m=>{m.records[0].uid=0;},'archive-record'],
  ['oversized record',m=>{m.records[0].size=33*1024*1024;},'archive-record'],
  ['incorrect total bytes',m=>{m.bytes++;},'archive-totals'],
  ['incorrect folder counts',m=>{m.mailboxes[0].folders[0].count=2;},'archive-totals'],
  ['duplicate declared folder',m=>{m.mailboxes[0].folders.push({...m.mailboxes[0].folders[0]});},'archive-duplicate-folder'],
  ['missing declared folder',m=>{m.mailboxes[0].folders=[];},'archive-record'],
  ['wrong record total',m=>{m.total++;},'archive-manifest'],
])test(name+' is rejected even with an authenticated manifest',async t=>{
  const f=await fixture(t);mutate(f.manifest);await f.writeManifest();
  await assert.rejects(f.verify(),new RegExp(reason));
});
