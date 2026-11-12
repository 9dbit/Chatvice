/** Public signup browser smoke, synthetic UI/API only. No provider, DB or real user data. */
import assert from "node:assert/strict";
import express from "express";
import {resolve} from "node:path";
import {chromium} from "@playwright/test";
const app=express();
app.use("/assets",express.static(resolve("dist/mail-app/assets")));
app.get(["/","/login","/signup","/signup/verify","/activate"],(_q,res)=>res.sendFile(resolve("dist/mail-app/mail-app.html")));
const server=await new Promise(ok=>{const s=app.listen(0,"127.0.0.1",()=>ok(s));});
const host="http://127.0.0.1:"+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
  page.setDefaultTimeout(15000);
  const errors=[],submitted=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.turnstile={
      render(_element,opts){opts.callback("synthetic-human-token");return "fixture-widget";},
      remove(){},reset(){},
    };
  });
  await page.route("https://challenges.cloudflare.com/**",route=>route.fulfill({
    status:200,contentType:"application/javascript",body:"/* synthetic Turnstile script */"
  }));
  await page.route("**/api/**",route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    const respond=(body,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
    if(path==="/api/mail-auth/session")return respond({error:"Authentication required"},401);
    if(path==="/api/mail-auth/signup/config")return respond({enabled:true,domain:"chatvice.app",siteKey:"synthetic-site-key"});
    if(path==="/api/mail-auth/signup/request"){
      submitted.push(req.postDataJSON());
      return respond({accepted:true},202);
    }
    if(path==="/api/mail-auth/signup/verify"){
      assert.deepEqual(req.postDataJSON(),{token:"a".repeat(64)});
      return respond({address:"studio-guest@chatvice.app",activationUrl:host+"/activate#token="+"b".repeat(64),status:"awaiting_activation"});
    }
    if(path==="/api/mail-auth/activate")return respond({activated:true,email:"studio-guest@chatvice.app"});
    return respond({},404);
  });
  await page.goto(host+"/signup");
  await page.getByRole("heading",{name:"CREATE ACCOUNT_"}).waitFor();
  await page.getByPlaceholder("yourname").fill("studio-guest");
  await page.getByPlaceholder("Your name").fill("Studio Guest");
  await page.getByPlaceholder("you@your-current-email.com").fill("guest@example.invalid");
  await page.getByRole("button",{name:/Continue with email verification/}).click();
  await page.getByRole("heading",{name:"CHECK YOUR EMAIL_"}).waitFor();
  assert.equal(submitted.length,1);
  assert.deepEqual(submitted[0],{
    contactEmail:"guest@example.invalid",localPart:"studio-guest",
    displayName:"Studio Guest",turnstileToken:"synthetic-human-token"
  });
  await page.goto(host+"/signup/verify#token="+"a".repeat(64));
  await page.getByRole("heading",{name:"VERIFY CONTACT_"}).waitFor();
  await page.getByRole("button",{name:"Verify and create mailbox"}).click();
  await page.getByRole("heading",{name:"ACTIVATE ACCOUNT_"}).waitFor();
  await page.getByLabel("New password").fill("Synthetic strong password 2026 only");
  await page.getByLabel("Confirm password").fill("Synthetic strong password 2026 only");
  await page.getByRole("button",{name:"Activate account"}).click();
  await page.getByRole("heading",{name:"ACCOUNT ACTIVATED_"}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,"mobile signup must not overflow");
  await page.setViewportSize({width:1440,height:900});
  await page.goto(host+"/");
  await page.getByRole("link",{name:/Create an email address/}).waitFor();
  await page.getByRole("link",{name:/Open your inbox/}).waitFor();
  assert.deepEqual(errors,[]);
  console.log("PASS: public signup mobile form, Turnstile callback, verify contact, password activation, desktop landing with existing inbox CTA; all synthetic.");
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
