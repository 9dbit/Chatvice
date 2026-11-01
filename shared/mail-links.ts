export type MailTextPart = {text:string;href?:string};

// Return the original spelling: verification tokens and query strings must not
// be decoded, normalized or rewritten. Never fetch/preload a message URL.
export function safeMailHref(value:string):string|undefined{
 if(!/^https?:\/\//i.test(value)||/[\s\u0000-\u001f\u007f<>"\\]/.test(value))return;
 try{
  const url=new URL(value);
  if(!url.hostname||url.username||url.password)return;
  return value;
 }catch{return;}
}

export function mailTextParts(text:string):MailTextPart[]{
 const parts:MailTextPart[]=[];
 // Bracketed URLs are produced by plain-text email converters, including
 // wrapped confirmation links. Join line breaks only inside those brackets.
 const urls=/\[https?:\/\/[^\]<>]+\]|https?:\/\/[^\s<>"\[\]]+/gi;
 let cursor=0;
 for(const match of text.matchAll(urls)){
  const index=match.index!,raw=match[0],bracketed=raw.startsWith("[");
  let candidate=bracketed?raw.slice(1,-1).replace(/\r?\n[\t ]*/g,""):raw;
  if(!bracketed){
   candidate=candidate.replace(/[.,;:!?]+$/,"");
   // Keep balanced parentheses in URL paths; discard surrounding punctuation.
   while(candidate.endsWith(")")&&candidate.split(")").length>candidate.split("(").length)candidate=candidate.slice(0,-1);
  }
  const href=safeMailHref(candidate);
  // Do not turn embedded URL substrings inside another scheme/word into links.
  if(!href||(index>0&&!/[\s([{]/.test(text[index-1])))continue;
  if(index>cursor)parts.push({text:text.slice(cursor,index)});
  if(bracketed)parts.push({text:"["});
  parts.push({text:candidate,href});
  if(bracketed)parts.push({text:"]"});
  else if(raw.length>candidate.length)parts.push({text:raw.slice(candidate.length)});
  cursor=index+raw.length;
 }
 if(cursor<text.length)parts.push({text:text.slice(cursor)});
 return parts;
}
