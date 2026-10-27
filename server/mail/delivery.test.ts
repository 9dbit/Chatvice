import test from "node:test";
import assert from "node:assert/strict";
import {aggregateMailDeliveryStatus,mailDeliveryRecipientEvidence,type MailDeliveryEvent} from "./delivery";

const tenant="tenant_delivery_a",message="00000000-0000-4000-8000-000000000001";
const recipients={to:["customer@example.org"],cc:["reviewer@example.org"],bcc:["hidden@example.org"]};
process.env.CHATVICE_MAIL_ENCRYPTION_KEY="e".repeat(64);
const evidence=(reported:unknown,group=recipients)=>mailDeliveryRecipientEvidence(tenant,message,group,reported);
const event=(type:string,reported:unknown):MailDeliveryEvent=>({eventType:type,recipientKeys:evidence(reported).eventKeys});

test("recipient evidence normalizes/deduplicates all recipient types without storing addresses",()=>{
 const item=evidence(["Hidden <HIDDEN@example.org>","hidden@example.org","outsider@example.org"]);
 assert.equal(item.expectedKeys.length,3);assert.equal(item.eventKeys.length,1);
 assert.ok(item.expectedKeys.every(key=>/^[a-f0-9]{64}$/.test(key)));
 assert.ok(item.expectedKeys.includes(item.eventKeys[0]));
 const stored=JSON.stringify(item);
 for(const value of [...recipients.to,...recipients.cc,...recipients.bcc])assert.equal(stored.includes(value),false);
 assert.deepEqual(evidence(["CUSTOMER@EXAMPLE.ORG"]).eventKeys,evidence(["customer@example.org"]).eventKeys);
 const duplicate=mailDeliveryRecipientEvidence(tenant,message,
  {to:["customer@example.org"],cc:["CUSTOMER@example.org"],bcc:["hidden@example.org"]},[]);
 assert.equal(duplicate.expectedKeys.length,2);
});

test("recipient tags are stable but cannot be correlated across tenant, message or master key",()=>{
 const original=evidence(["hidden@example.org"]);
 assert.deepEqual(evidence(["hidden@example.org"]),original);
 assert.notEqual(mailDeliveryRecipientEvidence("tenant_delivery_b",message,recipients,["hidden@example.org"]).eventKeys[0],original.eventKeys[0]);
 assert.notEqual(mailDeliveryRecipientEvidence(tenant,message.replace("000001","000002"),recipients,["hidden@example.org"]).eventKeys[0],original.eventKeys[0]);
 process.env.CHATVICE_MAIL_ENCRYPTION_KEY="f".repeat(64);
 try{assert.notEqual(evidence(["hidden@example.org"]).eventKeys[0],original.eventKeys[0]);}
 finally{process.env.CHATVICE_MAIL_ENCRYPTION_KEY="e".repeat(64);}
});

test("only an unambiguous single recipient can fill missing provider recipient metadata",()=>{
 const one={to:["only@example.org"],cc:[],bcc:[]};
 for(const missing of [undefined,null,[]]){
  const single=evidence(missing,one);
  assert.deepEqual(single.eventKeys,single.expectedKeys);
  assert.deepEqual(evidence(missing).eventKeys,[]);
 }
 assert.deepEqual(evidence(["outsider@example.org"],one).eventKeys,[]);
 assert.deepEqual(evidence("only@example.org",one).eventKeys,[]);
});

test("all-recipient delivery requires separate evidence for To, CC and private BCC",()=>{
 const expected=evidence(undefined).expectedKeys;
 const to=event("email.delivered",recipients.to),cc=event("email.delivered",recipients.cc),bcc=event("email.delivered",recipients.bcc);
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[to]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[to,to,to]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[to,cc]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[to,cc,bcc]),"delivered");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[event("email.delivered",undefined)]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[event("email.delivered",["outsider@example.org"])]),"sent");
});

test("mixed recipient failures and bounces are order-independent and not masked by a delivery",()=>{
 const expected=evidence(undefined).expectedKeys;
 const delivered=event("email.delivered",recipients.to),failed=event("email.failed",recipients.cc),bounced=event("email.bounced",recipients.bcc);
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[delivered,failed]),"failed");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[failed,delivered]),"failed");
 assert.equal(aggregateMailDeliveryStatus("delivered",expected,[delivered,bounced]),"bounced");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[bounced,delivered]),"bounced");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[delivered,failed,bounced]),"bounced");
});

test("late sent events cannot downgrade final recipients and complaints remain delivery issues",()=>{
 const expected=evidence(undefined).expectedKeys;
 const all=event("email.delivered",[...recipients.to,...recipients.cc,...recipients.bcc]);
 const sent=event("email.sent",recipients.to);
 assert.equal(aggregateMailDeliveryStatus("delivered",expected,[all,sent]),"delivered");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[sent,all]),"delivered");
 const complained=event("email.complained",recipients.bcc);
 assert.equal(aggregateMailDeliveryStatus("delivered",expected,[all,complained,sent]),"bounced");
 assert.equal(aggregateMailDeliveryStatus("bounced",expected,[sent,complained,all]),"bounced");
});

test("expired failure only recovers after complete final delivery evidence",()=>{
 const expected=evidence(undefined).expectedKeys;
 const sent=event("email.sent",recipients.to),partial=event("email.delivered",recipients.to);
 assert.equal(aggregateMailDeliveryStatus("failed",expected,[sent]),"failed");
 assert.equal(aggregateMailDeliveryStatus("failed",expected,[partial]),"failed");
 const all=event("email.delivered",[...recipients.to,...recipients.cc,...recipients.bcc]);
 assert.equal(aggregateMailDeliveryStatus("failed",expected,[all]),"delivered");
 assert.equal(aggregateMailDeliveryStatus("failed",expected,[event("email.failed",recipients.to),all]),"delivered");
 assert.equal(aggregateMailDeliveryStatus("failed",expected,[event("email.bounced",recipients.bcc)]),"bounced");
});

test("missing recipient evidence never proves a multi-recipient delivery",()=>{
 const expected=evidence(undefined).expectedKeys;
 assert.equal(aggregateMailDeliveryStatus("delivered",expected,[]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[{eventType:"email.delivered",recipientKeys:[]}]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",[],[{eventType:"email.delivered",recipientKeys:[]}]),"sent");
 assert.equal(aggregateMailDeliveryStatus("sent",expected,[{eventType:"email.failed",recipientKeys:[]}]),"failed");
 assert.equal(aggregateMailDeliveryStatus("delivered",expected,[{eventType:"email.bounced",recipientKeys:[]}]),"bounced");
});

test("legacy single-recipient delivery survives late sent/failed, but not a bounce or complaint",()=>{
 const group={to:["only@example.org"],cc:[],bcc:[]};
 const expected=evidence(undefined,group).expectedKeys;
 const legacy:MailDeliveryEvent={eventType:"email.delivered",recipientKeys:[]};
 for(const type of ["email.sent","email.failed"]){
  const late={eventType:type,recipientKeys:evidence(["only@example.org"],group).eventKeys};
  assert.equal(aggregateMailDeliveryStatus("delivered",expected,[legacy,late]),"delivered");
 }
 for(const type of ["email.bounced","email.complained"]){
  const late={eventType:type,recipientKeys:evidence(["only@example.org"],group).eventKeys};
  assert.equal(aggregateMailDeliveryStatus("delivered",expected,[legacy,late]),"bounced");
 }
 const multi=evidence(undefined).expectedKeys;
 assert.equal(aggregateMailDeliveryStatus("delivered",multi,[legacy,event("email.sent",recipients.to)]),"sent");
});

test("unsupported event names never become accepted delivery evidence",()=>{
 const expected=evidence(undefined).expectedKeys;
 for(const eventType of ["email.delivery_delayed","constructor","toString","__proto__"])
  assert.equal(aggregateMailDeliveryStatus("queued",expected,[{eventType,recipientKeys:expected}]),"queued");
});

test("recipient evidence fails closed without a stable key or valid message scope",()=>{
 const previous=process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
 delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
 try{assert.throws(()=>evidence(recipients.to));}
 finally{process.env.CHATVICE_MAIL_ENCRYPTION_KEY=previous;}
 assert.throws(()=>mailDeliveryRecipientEvidence("../tenant",message,recipients,recipients.to));
 assert.throws(()=>mailDeliveryRecipientEvidence(tenant,"not-a-message",recipients,recipients.to));
});
