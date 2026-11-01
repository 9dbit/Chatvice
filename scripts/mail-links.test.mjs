import test from 'node:test';
import assert from 'node:assert/strict';
import {mailTextParts,safeMailHref} from '../shared/mail-links.ts';

const confirmation='https://auth.example.invalid/auth/v1/verify?token=synthetic%2Btoken%2Fonly&type=signup&redirect_to=https%3A%2F%2Fshop.example.invalid%2F';
test('confirmation query and percent encoding survive plain and wrapped email links',()=>{
 for(const body of [confirmation,`Confirm email address [${confirmation}]`,`Confirm email address [${confirmation.replace('&type','\n&type')}]`]){
  const links=mailTextParts(body).filter(p=>p.href);
  assert.equal(links.length,1);assert.equal(links[0].href,confirmation);
 }
});
test('punctuation, multiple links, paragraphs and ordinary text are preserved',()=>{
 const text='Hello\n\n(https://example.invalid/docs_(guide)). Next https://example.invalid/?a=1&b=2. Done';
 const parts=mailTextParts(text);
 assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.href).map(p=>p.href),['https://example.invalid/docs_(guide)','https://example.invalid/?a=1&b=2']);
 assert.deepEqual(mailTextParts('No links here.'),[{text:'No links here.'}]);
});
test('unsafe schemes, credentials, malformed destinations and controls are not links',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,test','file:///tmp/file','//example.invalid','https://user:password@example.invalid','https://','https://example.invalid\\evil','https://example.invalid/\u0001','https://example.invalid/a b'])assert.equal(safeMailHref(value),undefined,value);
 for(const text of ['javascript:alert(1)','data:text/html,https://example.invalid','javascript:https://example.invalid','https://user:password@example.invalid','[https://example.invalid/not a url]'])assert.equal(mailTextParts(text).some(p=>p.href),false,text);
});
test('markup remains literal and parsing performs no network requests',()=>{
 const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('No remote requests allowed');};
 try{const text='<img src=x onerror=alert(1)> <script>alert(1)</script> '+confirmation;
  assert.equal(mailTextParts(text).map(p=>p.text).join(''),text);
  assert.equal(mailTextParts(text).filter(p=>p.href).length,1);
 }finally{globalThis.fetch=old;}
});
