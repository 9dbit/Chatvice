/** Local immutable RFC822 preservation. JSONL stdin: {folder,uid,size,source}.
 * The caller supplies a separately protected 32-byte MAIL_ARCHIVE_KEY; this
 * utility never fetches mail, marks it read, sends it or writes a mailbox DB.
 */
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile,readdir,unlink} from 'node:fs/promises';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {createInterface} from 'node:readline';
const keyText=process.env.MAIL_ARCHIVE_KEY||'';
if(!/^[a-f0-9]{64}$/i.test(keyText))throw Error('Protected archive key required');
const key=Buffer.from(keyText,'hex');delete process.env.MAIL_ARCHIVE_KEY;
const root=resolve(process.env.MAIL_ARCHIVE_DIRECTORY||'../private-mail-archive');
await mkdir(root,{recursive:true,mode:0o700});
const magic=Buffer.from('CVMARCH1');
const sha=x=>createHash('sha256').update(x).digest('hex');
const scope=(folder,uid)=>{
  if(!['INBOX','INBOX.Sent'].includes(folder)||!Number.isSafeInteger(uid)||uid<1)throw Error('Invalid archive identity');
  return `hello@chatvice.app|${folder}|${uid}`;
};
function open(bytes,aad){
  if(bytes.length<36||!bytes.subarray(0,8).equals(magic))throw Error('Invalid archive envelope');
  const d=createDecipheriv('aes-256-gcm',key,bytes.subarray(8,20));
  d.setAAD(Buffer.from(aad));d.setAuthTag(bytes.subarray(20,36));
  return Buffer.concat([d.update(bytes.subarray(36)),d.final()]);
}
async function verifyAll(){
  let verified=0,totalBytes=0;
  for(const name of (await readdir(root)).filter(n=>!n.startsWith('.')&&n.endsWith('.json'))){
    const m=JSON.parse(await readFile(join(root,name),'utf8'));
    const data=open(await readFile(join(root,m.object)),scope(m.folder,m.uid));
    if(data.length!==m.size||sha(data)!==m.sha256)throw Error('Archive verification failed');
    verified++;totalBytes+=data.length;
  }
  console.log(JSON.stringify({verified,totalBytes,localEncryptedArchive:true}));
}
if(process.argv.includes('--verify')){await verifyAll();key.fill(0);process.exit(0);}
if(process.argv.includes('--serve')){
  const token=randomBytes(32).toString('hex');
  const endpoint=join(root,'.archive-endpoint.json');
  const server=createServer(async(req,res)=>{
    if(req.headers.authorization!=='Bearer '+token || req.headers.origin){res.writeHead(403);res.end();return;}
    if(req.method==='DELETE'){
      await unlink(endpoint).catch(()=>{});res.end('closed');
      server.close(()=>{key.fill(0);process.exit(0);});return;
    }
    if(req.method!=='POST'){res.writeHead(405);res.end();return;}
    let size=0;const chunks=[];
    try{
      for await(const chunk of req){size+=chunk.length;if(size>140*1024*1024)throw Error('limit');chunks.push(chunk);}
      const child=spawn(process.execPath,[fileURLToPath(import.meta.url)],{
        env:{...process.env,MAIL_ARCHIVE_KEY:keyText,MAIL_ARCHIVE_DIRECTORY:root},stdio:['pipe','pipe','pipe']});
      let output='';child.stdout.on('data',d=>{output+=d.toString()});
      child.stderr.resume();child.stdin.end(Buffer.concat(chunks));
      const status=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
      res.writeHead(status===0?200:500,{'Content-Type':'text/plain'});res.end(output);
    }catch{res.writeHead(500);res.end('Archive operation failed');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  await writeFile(endpoint,JSON.stringify({port:server.address().port,token}),{flag:'wx',mode:0o600});
  console.log('Protected archive listener ready on loopback; no key exported');
  await new Promise(()=>{});
}
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){
  try{
    if(line==='END'){await verifyAll();break;}
    const row=JSON.parse(line),aad=scope(row.folder,row.uid);
    if(typeof row.source!=='string'||!Number.isSafeInteger(row.size)||row.size<1||row.size>128*1024*1024)
      throw Error('Invalid raw source policy');
    const original=Buffer.from(row.source,'utf8');
    if(original.length!==row.size)throw Error('RFC822 byte count mismatch; refuse lossy archive');
    const prefix=row.folder==='INBOX'?'inbox':'sent',object=`${prefix}-${row.uid}.cvmail`;
    const manifest=join(root,`${prefix}-${row.uid}.json`);
    const digest=sha(original);
    let previous;
    try{previous=JSON.parse(await readFile(manifest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    if(previous){
      if(previous.sha256!==digest||previous.size!==row.size)throw Error('Immutable archive conflict');
      const restored=open(await readFile(join(root,object)),aad);
      if(sha(restored)!==digest)throw Error('Existing archive damaged');
      console.log(JSON.stringify({uid:row.uid,folder:row.folder,duplicate:true}));continue;
    }
    const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(aad));
    const ciphertext=Buffer.concat([c.update(original),c.final()]);
    const sealed=Buffer.concat([magic,iv,c.getAuthTag(),ciphertext]);
    // Authenticate and compare BEFORE committing the manifest.
    if(sha(open(sealed,aad))!==digest)throw Error('Encrypted archive roundtrip failed');
    await writeFile(join(root,object),sealed,{flag:'wx',mode:0o600});
    await writeFile(manifest,JSON.stringify({folder:row.folder,uid:row.uid,size:row.size,sha256:digest,object})+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({uid:row.uid,folder:row.folder,size:row.size,sha256:digest,verified:true}));
  }catch{console.log(JSON.stringify({error:'Archive record refused; verify source bytes and immutable target'}));}
}
key.fill(0);
