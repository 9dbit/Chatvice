// Sending follows the common 25 MB attachment allowance (decimal bytes).
// No outgoing file-count cap: decoded total and encoded message size are bounded.
export const MAX_MAIL_MESSAGE_ATTACHMENT_BYTES=25_000_000;
export const MAX_MAIL_ATTACHMENT_BYTES=MAX_MAIL_MESSAGE_ATTACHMENT_BYTES;
export const MAIL_ATTACHMENT_LIMIT_LABEL="25 MB";
export const MAX_MAIL_ENCODED_MESSAGE_BYTES=40_000_000;

// Receiving is a separate policy; changing sending must not silently expand ingestion.
export const MAX_MAIL_INBOUND_ATTACHMENT_BYTES=16*1024*1024;
export const MAX_MAIL_INBOUND_ATTACHMENTS=8;

/** Conservative MIME estimate: Base64, CRLF wrapping, part headers and message headers. */
export function estimateMailMessageBytes(totalBytes:number,count:number,textBytes=0):number {
  const encoded=Math.ceil(totalBytes/3)*4+count*4;
  const textEncoded=Math.ceil(textBytes/3)*4;
  return 65536+encoded+Math.ceil(encoded/76)*2+count*2048+
    textEncoded+Math.ceil(textEncoded/76)*2;
}
export function mailAttachmentSizeError(totalBytes:number,count:number,textBytes=0):string|null {
  if(!Number.isSafeInteger(totalBytes)||totalBytes<0||!Number.isSafeInteger(count)||count<0)
    return "Invalid attachment size.";
  if(totalBytes>MAX_MAIL_MESSAGE_ATTACHMENT_BYTES)
    return "Attachments exceed 25 MB total per email. Remove a file or choose smaller files.";
  if(estimateMailMessageBytes(totalBytes,count,textBytes)>MAX_MAIL_ENCODED_MESSAGE_BYTES)
    return "Email exceeds the sending size limit after encoding. Remove files or shorten the message.";
  return null;
}

