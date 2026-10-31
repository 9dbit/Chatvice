import { randomBytes,scrypt as scryptCallback,timingSafeEqual } from "node:crypto";
const options={N:32768,r:8,p:1,maxmem:64*1024*1024};
async function derive(password:string,salt:Buffer):Promise<Buffer>{
  return await new Promise<Buffer>((resolve,reject)=>{
    scryptCallback(password,salt,32,options,(error,derived)=>error?reject(error):resolve(derived));
  });
}
export async function hashMailPassword(password:string):Promise<string>{
  if(typeof password!=="string" || password.length<16 || password.length>256)
    throw new Error("Mail passwords require 16 to 256 characters");
  const salt=randomBytes(16),digest=await derive(password,salt);
  return `scrypt1.${salt.toString("hex")}.${digest.toString("hex")}`;
}
export async function verifyMailPassword(password:unknown,encoded:unknown):Promise<boolean>{
  if(typeof password!=="string" || password.length>256)return false;
  const match=typeof encoded==="string"?/^scrypt1\.([0-9a-f]{32})\.([0-9a-f]{64})$/.exec(encoded):null;
  // The same work is done for an unknown identity; no fast account lookup oracle.
  const derived=await derive(password,match?Buffer.from(match[1],"hex"):Buffer.alloc(16));
  const expected=match?Buffer.from(match[2],"hex"):Buffer.alloc(32);
  return timingSafeEqual(derived,expected) && !!match;
}
