import { mailTextParts } from "@shared/mail-links";

export default function MailMessageBody({text}:{text:string}){
 return <p className="mail-message-body">{mailTextParts(text||"This message has no readable text content.").map((part,index)=>
  part.href?<a key={index} className="mail-message-link" href={part.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{part.text}</a>:part.text
 )}</p>;
}
