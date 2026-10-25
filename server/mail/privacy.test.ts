import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");
test("private mail documents must disable marketing tag bootstrapping",()=>{
 const html=read("client/index.html");
 assert.match(html,/new RegExp\("\^\/dashboard\/mail\(\?:\/\|\$\)"\)/);
 assert.match(html,/if \(new RegExp\("\^\/dashboard\/mail\(\?:\/\|\$\)"\)\.test\(w\.location\.pathname\)\) return;/);
 const dashboard=read("client/src/pages/dashboard/layout.tsx");
 assert.match(dashboard,/window\.location\.replace\(location\)/);
 assert.match(dashboard,/isMailPath && !privateMailDocument/);
});
test("private mail routes require server no-store and strict CSP",()=>{
 const server=read("server/index.ts");
 const start=server.indexOf('app.use("/dashboard/mail"');
 assert.ok(start>=0);
 const section=server.slice(start,start+1100);
 assert.match(section,/X-Robots-Tag/);
 assert.match(section,/Cache-Control/);
 assert.match(section,/Content-Security-Policy/);
 assert.match(section,/script-src 'self'/);
 assert.match(section,/frame-ancestors 'none'/);
 assert.match(section,/connect-src 'self'/);
});
test("inbox must never render untrusted HTML as raw markup",()=>{
 const inbox=read("client/src/pages/dashboard/mail.tsx");
 assert.equal(inbox.includes("dangerouslySetInnerHTML"),false);
 assert.equal(inbox.includes(".innerHTML"),false);
 assert.match(inbox,/\{m\.text_body\}/);
 const mailRoute=read("server/mail/routes.ts");
 assert.match(mailRoute,/CHATVICE_MAIL_ALLOWED_ORIGINS/);
 assert.match(mailRoute,/CHATVICE_MAIL_OUTBOUND_ENABLED/);
});
test("AI requires explicit per-action consent and does not auto send",()=>{
 const ai=read("server/mail/ai.ts");
 assert.match(ai,/acknowledgeExternalProcessing/);
 assert.match(ai,/CHATVICE_MAIL_AI_ENABLED/);
 assert.match(ai,/redactCommonPII/);
 const ui=read("client/src/pages/dashboard/mail.tsx");
 assert.match(ui,/window\.confirm\(/);
 assert.match(ui,/requiresHumanReview|setBody\(data\.text\)/);
});
