import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
process.env.DATABASE_URL ||= 'postgresql://unused@127.0.0.1:1/unused';
const {parseRouterMail,registerMailRouterRaw}=await import('./router-raw');
const {default:worker}=await import('../../workers/mail-router/worker.mjs');
const secret='a'.repeat(64);
const env={CHATVICE_MAIL_ROUTER_SECRET:secret,CHATVICE_MAIL_APP_ORIGIN:'https://mail.example.invalid',CHATVICE_MAIL_ROUTER_DOMAINS:'chatvice.app',CHATVICE_MAIL_ROUTER_FORWARD_TO:'router@transport.example.invalid'};
const raw=Buffer.from('From: Dreamina <dreamina@mail.capcut.com>\r\nTo: other@chatvice.app\r\nSubject: MIME compatibility test\r\nMessage-ID: <mime-test@example.invalid>\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>'+ 'x'.repeat(4000)+'</p>');
function message(){return {to:'Hello@chatvice.app',rawSize:raw.length,raw:new ReadableStream({start(c){c.enqueue(raw);c.close();}}),headers:new Headers({'message-id':'<mime-test@example.invalid>'}),async forward(){assert.fail('hello must not use SMTP forwarding: cannot forward email to same worker');},setReject(){throw Error('unexpected rejection');}};}
test('long unwrapped HTML parses and routes only to the SMTP envelope, with stable retry identity',async()=>{
 const a=await parseRouterMail(raw,'hello@chatvice.app'),b=await parseRouterMail(raw,'hello@chatvice.app');
 assert.equal(a.data.html?.trimEnd(),'<p>'+'x'.repeat(4000)+'</p>');
 assert.deepEqual(a.data.envelopeRecipients,['hello@chatvice.app']);assert.deepEqual(a.data.to,['other@chatvice.app']);
 assert.equal(a.data.eventId,b.data.eventId);
 await assert.rejects(parseRouterMail(raw,'other@chatvice.app'));
});
test('multipart MIME preserves binary attachments and decoded subject',async()=>{
 const input=Buffer.from('From: sender@example.com\r\nTo: hello@chatvice.app\r\nSubject: =?UTF-8?B?VGVzdCDwn5iA?=\r\nContent-Type: multipart/mixed; boundary=b\r\n\r\n--b\r\nContent-Type: text/plain\r\n\r\nTest\r\n--b\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="test.bin"\r\nContent-Transfer-Encoding: base64\r\n\r\nAAEC/w==\r\n--b--\r\n');
 const out=await parseRouterMail(input,'hello@chatvice.app');assert.equal(out.data.subject,'Test 😀');
 assert.equal(out.files.length,1);assert.deepEqual(out.files[0].bytes,Buffer.from([0,1,2,255]));
});
test('raw ingress rejects unauthenticated and wrong-mailbox requests before parsing',async()=>{
 process.env.CHATVICE_MAIL_ENABLED='true';process.env.CHATVICE_MAIL_ROUTER_SECRET=secret;
 const app=express();registerMailRouterRaw(app);
 await request(app).post('/api/mail/router/raw').set('Content-Type','message/rfc822').send(raw).expect(401);
 await request(app).post('/api/mail/router/raw').set('Authorization','Bearer '+secret).set('X-Chatvice-Recipient','other@chatvice.app').send(raw).expect(403);
 await request(app).post('/api/mail/router/raw').set('Authorization','Bearer '+secret).set('X-Chatvice-Recipient','hello@chatvice.app').send({raw:'bad'}).expect(415);
});
test('hello uses authenticated raw ingress without attempting same-Worker SMTP forwarding',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async(url:any,init:any)=>{calls++;assert.equal(url,env.CHATVICE_MAIL_APP_ORIGIN+'/api/mail/router/raw');
  assert.equal(init.headers.Authorization,'Bearer '+secret);assert.equal(init.redirect,'error');
  assert.equal(init.headers['X-Chatvice-Recipient'],'hello@chatvice.app');assert.deepEqual(Buffer.from(init.body),raw);
  return Response.json({accepted:true});}) as any;
 try{await worker.email(message(),env);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
test('unavailable raw storage retries then fails instead of silently acknowledging',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(null,{status:503});}) as any;
 try{await assert.rejects(worker.email(message(),env),/Raw mail delivery unavailable/);assert.equal(calls,2);}
 finally{globalThis.fetch=original;}
});
