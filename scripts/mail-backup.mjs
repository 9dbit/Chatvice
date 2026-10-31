/** Authenticated wrapper for a bounded pg_dump stream. Never prints the key. */
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const magic=Buffer.from('CVPGBAK1'),aad=Buffer.from('chatvice-mail-pg-dump-v1');
const MAX=512*1024*1024;
function key(raw){if(!/^[a-f0-9]{64}$/i.test(raw||''))throw Error('Separate backup key required');return Buffer.from(raw,'hex');}
export function sealMailBackup(data,raw){
  if(!Buffer.isBuffer(data)||!data.length||data.length>MAX)throw Error('Backup size policy');
  const secret=key(raw),iv=randomBytes(12);
  try{const c=createCipheriv('aes-256-gcm',secret,iv);c.setAAD(aad);
    const encrypted=Buffer.concat([c.update(data),c.final()]);return Buffer.concat([magic,iv,c.getAuthTag(),encrypted]);
  }finally{secret.fill(0);}
}
export function openMailBackup(data,raw){
  if(!Buffer.isBuffer(data)||data.length<=36||data.length>MAX+36||!data.subarray(0,8).equals(magic))throw Error('Backup envelope policy');
  const secret=key(raw);
  try{const d=createDecipheriv('aes-256-gcm',secret,data.subarray(8,20));d.setAAD(aad);d.setAuthTag(data.subarray(20,36));
    // Authenticate before releasing any bytes to a restore process.
    return Buffer.concat([d.update(data.subarray(36)),d.final()]);
  }finally{secret.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    let total=0;const chunks=[];
    for await(const part of process.stdin){total+=part.length;if(total>MAX+36)throw Error('Backup size policy');chunks.push(part);}
    const data=Buffer.concat(chunks),secret=process.env.CHATVICE_MAIL_BACKUP_KEY;
    const mode=process.argv[2];if(!['seal','open'].includes(mode))throw Error('Use seal or open');
    process.stdout.write(mode==='seal'?sealMailBackup(data,secret):openMailBackup(data,secret));
  }catch{console.error('Mail backup operation failed; no unauthenticated output released');process.exitCode=1;}
}
