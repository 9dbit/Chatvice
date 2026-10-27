import {createHmac,hkdfSync} from "node:crypto";
import {normalizeEmail} from "./security";

export const MAIL_DELIVERY_STATES:Readonly<Record<string,string|undefined>>=Object.freeze(Object.assign(Object.create(null),{
  "email.sent":"sent",
  "email.delivered":"delivered",
  "email.bounced":"bounced",
  "email.complained":"bounced",
  "email.failed":"failed",
}));
type Recipients={to:unknown;cc?:unknown;bcc?:unknown};
export type MailDeliveryEvent={eventType:string;recipientKeys:readonly string[]};

function addresses(value:unknown,limit:number):string[]{
  return Array.isArray(value)?value.slice(0,limit).map(normalizeEmail)
    .filter((address):address is string=>address!==null):[];
}

/** Opaque evidence is bound to this tenant/message, including private BCC recipients. */
export function mailDeliveryRecipientEvidence(
  tenantId:string,messageId:string,recipients:Recipients,eventRecipients:unknown,
):{expectedKeys:string[];eventKeys:string[]}{
  if(!/^[a-zA-Z0-9_-]{1,32}$/.test(tenantId) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId))
    throw new Error("Invalid delivery evidence scope");
  const raw=(process.env.CHATVICE_MAIL_ENCRYPTION_KEY||"").trim();
  if(!/^[0-9a-f]{64}$/i.test(raw))throw new Error("Private delivery evidence key unavailable");
  const expected=Array.from(new Set([...addresses(recipients.to,50),
    ...addresses(recipients.cc,50),...addresses(recipients.bcc,50)]));
  const missing=eventRecipients===undefined || eventRecipients===null ||
    (Array.isArray(eventRecipients)&&eventRecipients.length===0);
  // Older single-recipient events are unambiguous. Never apply that fallback to
  // a multi-recipient message or an explicitly different recipient address.
  const reported=missing&&expected.length===1?expected:addresses(eventRecipients,150);
  const expectedSet=new Set(expected);
  const matched=Array.from(new Set(reported.filter(address=>expectedSet.has(address))));
  const master=Buffer.from(raw,"hex");
  let key:Buffer|undefined;
  try{
    key=Buffer.from(hkdfSync("sha256",master,Buffer.from("chatvice-mail-delivery-recipient-v1"),
      Buffer.from(JSON.stringify([tenantId,messageId.toLowerCase()])),32));
    const tag=(address:string)=>createHmac("sha256",key!).update(address).digest("hex");
    return {expectedKeys:expected.map(tag),eventKeys:matched.map(tag)};
  }finally{master.fill(0);key?.fill(0);}
}

/** Fold per-recipient evidence before deriving the existing message-level status. */
export function aggregateMailDeliveryStatus(
  currentStatus:string,expectedKeys:readonly string[],events:readonly MailDeliveryEvent[],
):string{
  const expected=new Set(expectedKeys);
  const outcomes=new Map<string,string>();
  const priority:Readonly<Record<string,number>>={sent:1,failed:2,delivered:3,bounced:4};
  let accepted=false,unattributedFailure=false,unattributedBounce=false;
  for(const event of events){
    const state=MAIL_DELIVERY_STATES[event.eventType];
    if(!state)continue;
    accepted=true;
    const matched=Array.from(new Set(event.recipientKeys.filter(key=>expected.has(key))));
    if(!matched.length){
      // A signed failure still warrants a conservative message-level warning.
      // An unattributed delivery can never stand in for every recipient.
      if(state==="failed")unattributedFailure=true;
      if(state==="bounced")unattributedBounce=true;
    }
    for(const key of matched){
      const previous=outcomes.get(key);
      if(!previous || priority[state]>priority[previous])outcomes.set(key,state);
    }
  }
  const states=Array.from(outcomes.values());
  if(currentStatus==="bounced" || unattributedBounce || states.includes("bounced"))return "bounced";
  // A pre-migration delivery for exactly one recipient is already unambiguous.
  // Preserve that final receipt against late accepted/failed notifications.
  if(currentStatus==="delivered"&&expected.size===1)return "delivered";
  if(expected.size>0 && Array.from(expected).every(key=>outcomes.get(key)==="delivered"))return "delivered";
  // Preserve an expired/failed send until final evidence covers every recipient.
  if(currentStatus==="failed" || unattributedFailure || states.includes("failed"))return "failed";
  if(accepted)return "sent";
  // A pre-migration multi-recipient summary alone is not proof of all deliveries.
  return currentStatus==="delivered"&&expected.size!==1?"sent":currentStatus;
}
