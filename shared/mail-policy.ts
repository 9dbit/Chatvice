// 40 MB is the product-level combined upload budget (decimal bytes).
// Resend limits the entire email after encoding; oversized files are delivered
// through authenticated-at-rest, expiring private download links instead.
export const MAX_MAIL_MESSAGE_ATTACHMENT_BYTES=40_000_000;
export const MAX_MAIL_ATTACHMENT_BYTES=MAX_MAIL_MESSAGE_ATTACHMENT_BYTES;
export const MAIL_ATTACHMENT_LIMIT_LABEL="40 MB";
export const MAX_MAIL_NATIVE_ATTACHMENT_BYTES=25_000_000;
export const MAX_MAIL_ENCODED_MESSAGE_BYTES=40_000_000;
export const MAIL_SHARE_LINK_DAYS=7;

// Receiving remains a separate, deliberately smaller security policy.
export const MAX_MAIL_INBOUND_ATTACHMENT_BYTES=16*1024*1024;
export const MAX_MAIL_INBOUND_ATTACHMENTS=8;

/** Conservative MIME estimate: Base64, CRLF wrapping, part headers and message headers. */
export function estimateMailMessageBytes(totalBytes:number,count:number,textBytes=0):number {
  const encoded=Math.ceil(totalBytes/3)*4+count*4;
  const textEncoded=Math.ceil(textBytes/3)*4;
  return 65536+encoded+Math.ceil(encoded/76)*2+count*2048+
    textEncoded+Math.ceil(textEncoded/76)*2;
}
export function mailAttachmentSizeError(totalBytes:number,count:number,_textBytes=0):string|null {
  if(!Number.isSafeInteger(totalBytes)||totalBytes<0||!Number.isSafeInteger(count)||count<0)
    return "Invalid attachment size.";
  if(totalBytes>MAX_MAIL_MESSAGE_ATTACHMENT_BYTES)
    return "Attachments exceed 40 MB total per email. Remove a file or choose smaller files.";
  return null;
}
/** Only for files that will be serialized directly into Resend's email request. */
export function mailNativeAttachmentSizeError(totalBytes:number,count:number,textBytes=0):string|null {
  if(mailAttachmentSizeError(totalBytes,count,textBytes))return "Invalid outgoing attachment size.";
  if(totalBytes>MAX_MAIL_NATIVE_ATTACHMENT_BYTES)
    return "Native attachments exceed the provider's 25 MB allowance.";
  if(estimateMailMessageBytes(totalBytes,count,textBytes)>MAX_MAIL_ENCODED_MESSAGE_BYTES)
    return "Email exceeds the 40 MB provider size limit after encoding.";
  return null;
}
export function shouldUseSecureMailLinks(totalBytes:number,count:number,textBytes=0):boolean {
  if(mailAttachmentSizeError(totalBytes,count,textBytes))throw new Error("Invalid attachment budget");
  return totalBytes>0 && mailNativeAttachmentSizeError(totalBytes,count,textBytes)!==null;
}
