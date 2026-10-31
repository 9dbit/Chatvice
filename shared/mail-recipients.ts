/** Recipient helpers for the human-operated mail composer. No BCC input is used
 * when deriving replies; it must never become part of a Reply All recipient set. */
export function parseMailRecipients(value: string): string[] {
  return uniqueAddresses(value.split(/[,;]/));
}
function uniqueAddresses(values: string[]): string[] {
  return Array.from(new Set(values.map(value=>value.trim().toLowerCase()).filter(Boolean)));
}
export function mailReplyRecipients(
  message: {from_email:string;to_emails:string[];cc_emails?:string[]},
  ownAddresses: string[],
  replyAll = false
): {to:string[];cc:string[]} {
  if(!replyAll)return {to:uniqueAddresses([message.from_email]),cc:[]};
  const own=new Set(uniqueAddresses(ownAddresses));
  const to=uniqueAddresses([message.from_email,...message.to_emails]).filter(value=>!own.has(value));
  const toSet=new Set(to);
  const cc=uniqueAddresses(message.cc_emails||[]).filter(value=>!own.has(value)&&!toSet.has(value));
  return {to,cc};
}
