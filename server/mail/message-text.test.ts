import test from "node:test";
import assert from "node:assert/strict";
import { readableMailText, MAIL_HTML_TEXT_MAX_INPUT, MAIL_HTML_TEXT_MAX_OUTPUT } from "./message-text";

test("mail reader keeps an existing plain-text body exactly as received",()=>{
 const text="  Customer says <strong>literal text</strong>\n\nKeep this spacing.  ";
 assert.equal(readableMailText(text,"<p>Different HTML body</p>"),text);
 const unreadHtml={trim(){throw new Error("An existing text body must bypass HTML parsing");}};
 assert.equal(readableMailText(text,unreadHtml as any),text);
 assert.equal(readableMailText("",null),"");
 assert.equal(readableMailText(null,"  "),"");
});

test("HTML-only mail becomes readable text without scripts, resources or attribute URLs",()=>{
 const originalFetch=globalThis.fetch;
 let requests=0;
 globalThis.fetch=(()=>{requests++;throw new Error("HTML parsing must never fetch resources");}) as typeof fetch;
 try{
  const html=`<!doctype html><html><head>
    <title>Hidden document title</title>
    <link rel="stylesheet" href="https://mail-tracker.example.invalid/style.css">
    <style>@font-face{font-family:tracking;src:url(https://mail-tracker.example.invalid/font)}p{background:url(https://mail-tracker.example.invalid/background)}</style>
   </head><body><p>Hello &amp; welcome &#x1f642;.</p>
    <p>Second paragraph.<br>Next line with &lt;strong&gt;literal markup&lt;/strong&gt;.</p>
    <p><a href="https://mail-tracker.example.invalid/link">Read project details</a></p>
    <script>globalThis.__mailHtmlExecuted=true;fetch("https://mail-tracker.example.invalid/script")</script>
    <img alt="Tracking secret" src="https://mail-tracker.example.invalid/pixel" onerror="globalThis.__mailHtmlExecuted=true">
    <iframe src="https://mail-tracker.example.invalid/frame">Hidden frame</iframe>
    <object data="https://mail-tracker.example.invalid/object">Hidden object</object>
    <svg><text>Hidden SVG</text><script>globalThis.__mailHtmlExecuted=true</script></svg>
    <template>Hidden template</template><div hidden>Hidden content</div>
   </body></html>`;
  const result=readableMailText(" \n\t",html);
  assert.equal(result,"Hello & welcome 🙂.\n\nSecond paragraph.\nNext line with <strong>literal markup</strong>.\n\nRead project details");
  assert.equal(result.includes("mail-tracker.example.invalid"),false);
  assert.equal((globalThis as any).__mailHtmlExecuted,undefined);
  assert.equal(requests,0);
 }finally{globalThis.fetch=originalFetch;}
});

test("HTML fallback bounds input, output and nested traversal",()=>{
 const large=readableMailText("","<p>"+"x".repeat(MAIL_HTML_TEXT_MAX_INPUT+100)+"</p>");
 assert.ok(large.startsWith("x"));
 assert.ok(large.endsWith("[Message text truncated]"));
 assert.ok(large.length<=MAIL_HTML_TEXT_MAX_OUTPUT+30);
 const deep=readableMailText("","<div>".repeat(150)+"Deep content"+"</div>".repeat(150));
 assert.equal(deep.includes("Deep content"),false);
 assert.ok(deep.includes("[Message text truncated]"));
 const wide=readableMailText("","<p>x</p>".repeat(10_002));
 assert.ok(wide.includes("[Message text truncated]"));
});

test("malformed HTML remains plain text and does not restore active markup",()=>{
 const result=readableMailText("",'<p>First &amp; second<p>Last <a href="javascript:alert(1)">link</a><img src=x>');
 assert.equal(result,"First & second\n\nLast link");
});
