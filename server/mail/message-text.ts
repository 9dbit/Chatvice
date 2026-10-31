import { compile } from "html-to-text";

export const MAIL_HTML_TEXT_MAX_INPUT=1_000_000;
export const MAIL_HTML_TEXT_MAX_OUTPUT=500_000;
const truncation="[Message text truncated]";
// html-to-text uses htmlparser2's string parser, not a browser document. It has
// no resource loader, JavaScript execution or live elements. Only plain text is
// returned to the client; no raw HTML or URL-valued attributes cross the API.
const convert=compile({
 wordwrap:false,
 limits:{maxInputLength:MAIL_HTML_TEXT_MAX_INPUT,maxDepth:64,maxChildNodes:10_000,maxBaseElements:1,ellipsis:truncation},
 selectors:[
  ...["script","style","iframe","frame","frameset","object","embed","applet","img","picture","source","video","audio","canvas","svg","math","template","noscript","head","title","meta","link","base","input","[hidden]",'[aria-hidden="true"]'].map(selector=>({selector,format:"skip"})),
  {selector:"a",options:{ignoreHref:true}},
  ...["h1","h2","h3","h4","h5","h6"].map(selector=>({selector,options:{uppercase:false}}))
 ]
});

export function readableMailText(text:string|null|undefined,html:string|null|undefined):string{
 if(text?.trim())return text;
 if(!html?.trim())return "";
 const input=html.slice(0,MAIL_HTML_TEXT_MAX_INPUT);
 const converted=convert(input).trim();
 const clipped=converted.slice(0,MAIL_HTML_TEXT_MAX_OUTPUT);
 return html.length>input.length||converted.length>clipped.length?`${clipped}\n\n${truncation}`:clipped;
}
