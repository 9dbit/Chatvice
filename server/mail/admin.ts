import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { pool } from "../db";
import { z } from "zod";

const id=z.string().uuid();
const localPart=z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._+-]{0,63}$/);
function merchant(req:Request,res:Response):string|null {
  const sess=req.session as any;
  if(sess?.userType!=="merchant" || !sess?.userId || sess.userId!==sess.merchantId) {
    res.status(403).json({error:"Merchant administrator required"});return null;
  }
  return sess.merchantId;
}
function fail(res:Response,err:unknown){
  if(err instanceof z.ZodError)return res.status(400).json({error:"Invalid request"});
  if((err as any)?.code==="23505")return res.status(409).json({error:"Address already registered"});
  return res.status(500).json({error:"Mail admin error"});
}
function wrap(fn:(req:Request,res:Response)=>Promise<unknown>){
  return (req:Request,res:Response)=>{Promise.resolve(fn(req,res)).catch(err=>fail(res,err));};
}
export function registerMailAdminRoutes(app:Express):void {
  app.get("/api/mail/domains/:id/dns",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const domainId=id.parse(req.params.id);
    const q=await pool.query("SELECT domain,verification_token,status FROM mail_domains WHERE id=$1 AND tenant_id=$2",[domainId,tenant]);
    if(!q.rowCount)return res.sendStatus(404);
    const d=q.rows[0];
    return res.json({type:"TXT",host:`_chatvice-mail.${d.domain}`,value:`chatvice-verify=${d.verification_token}`,status:d.status});
  }));
  app.post("/api/mail/domains/:id/verify",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const domainId=id.parse(req.params.id);
    const q=await pool.query("SELECT domain,verification_token,status FROM mail_domains WHERE id=$1 AND tenant_id=$2",[domainId,tenant]);
    if(!q.rowCount)return res.sendStatus(404);
    const d=q.rows[0];if(d.status==="disabled")return res.status(409).json({error:"Domain disabled"});
    const host=`_chatvice-mail.${d.domain}`;
    let txt:string[][];
    try{txt=await resolveTxt(host);}catch{return res.status(409).json({error:"TXT verification record not found"});}
    const expected=`chatvice-verify=${d.verification_token}`;
    if(!txt.some(chunks=>chunks.join("")===expected))return res.status(409).json({error:"TXT verification value does not match"});
    const updated=await pool.query("UPDATE mail_domains SET status='verified',verified_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING id,domain,status",[domainId,tenant]);
    return res.json(updated.rows[0]);
  }));
  app.get("/api/mail/mailboxes/:id/members",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id);
    const q=await pool.query(`SELECT m.user_id,m.role FROM mail_memberships m JOIN mail_mailboxes b ON b.id=m.mailbox_id
      WHERE m.mailbox_id=$1 AND m.tenant_id=$2 AND b.tenant_id=$2 ORDER BY m.user_id`,[box,tenant]);
    res.json(q.rows);
  }));
  app.post("/api/mail/mailboxes/:id/members",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id);
    const d=z.object({userId:z.string().min(1).max(64),role:z.enum(["owner","member","viewer"])}).parse(req.body);
    const exists=await pool.query("SELECT id FROM mail_mailboxes WHERE id=$1 AND tenant_id=$2",[box,tenant]);
    if(!exists.rowCount)return res.sendStatus(404);
    const user=await pool.query("SELECT id FROM supervisors WHERE id=$1 AND merchant_id=$2",[d.userId,tenant]);
    if(!user.rowCount)return res.status(404).json({error:"Supervisor not in this tenant"});
    await pool.query(`INSERT INTO mail_memberships(id,tenant_id,mailbox_id,user_id,role) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(mailbox_id,user_id) DO UPDATE SET role=EXCLUDED.role`,[randomUUID(),tenant,box,d.userId,d.role]);
    res.status(201).json({assigned:true});
  }));
  app.delete("/api/mail/mailboxes/:id/members/:userId",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id);
    const q=await pool.query("DELETE FROM mail_memberships WHERE tenant_id=$1 AND mailbox_id=$2 AND user_id=$3 RETURNING id",[tenant,box,req.params.userId]);
    res.status(q.rowCount?200:404).json({removed:!!q.rowCount});
  }));
  app.get("/api/mail/mailboxes/:id/aliases",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id);
    const q=await pool.query("SELECT a.id,a.local_part,d.domain FROM mail_aliases a JOIN mail_domains d ON d.id=a.domain_id WHERE a.mailbox_id=$1 AND a.tenant_id=$2",[box,tenant]);
    res.json(q.rows);
  }));
  app.post("/api/mail/mailboxes/:id/aliases",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id);
    const d=z.object({localPart}).parse(req.body);
    const c=await pool.connect();
    try{
      await c.query("BEGIN");
      const q=await c.query(`SELECT b.domain_id FROM mail_mailboxes b JOIN mail_domains d ON d.id=b.domain_id
        WHERE b.id=$1 AND b.tenant_id=$2 AND d.tenant_id=$2 FOR UPDATE OF d`,[box,tenant]);
      if(!q.rowCount){await c.query("ROLLBACK");return res.sendStatus(404);}
      const domainId=q.rows[0].domain_id;
      const conflict=await c.query("SELECT 1 FROM mail_mailboxes WHERE domain_id=$1 AND local_part=$2",[domainId,d.localPart]);
      if(conflict.rowCount){await c.query("ROLLBACK");return res.status(409).json({error:"Address is already a mailbox"});}
      const aliasId=randomUUID();
      await c.query("INSERT INTO mail_aliases(id,tenant_id,domain_id,mailbox_id,local_part) VALUES($1,$2,$3,$4,$5)",[aliasId,tenant,domainId,box,d.localPart]);
      await c.query("COMMIT");res.status(201).json({id:aliasId,localPart:d.localPart});
    }catch(err){await c.query("ROLLBACK");throw err;}finally{c.release();}
  }));
  app.delete("/api/mail/mailboxes/:id/aliases/:aliasId",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id),aliasId=id.parse(req.params.aliasId);
    const q=await pool.query("DELETE FROM mail_aliases WHERE id=$1 AND mailbox_id=$2 AND tenant_id=$3 RETURNING id",[aliasId,box,tenant]);
    res.status(q.rowCount?200:404).json({removed:!!q.rowCount});
  }));
  app.patch("/api/mail/mailboxes/:id",wrap(async(req,res)=>{
    const tenant=merchant(req,res);if(!tenant)return;
    const box=id.parse(req.params.id);
    const d=z.object({enabled:z.boolean().optional(),displayName:z.string().max(120).optional()})
      .refine(x=>Object.values(x).some(v=>v!==undefined)).parse(req.body);
    const q=await pool.query(`UPDATE mail_mailboxes SET enabled=COALESCE($1,enabled), display_name=COALESCE($2,display_name)
      WHERE id=$3 AND tenant_id=$4 RETURNING id,enabled,display_name`,[d.enabled??null,d.displayName??null,box,tenant]);
    if(!q.rowCount)return res.sendStatus(404);
    res.json(q.rows[0]);
  }));
}
