import test from "node:test";
import assert from "node:assert/strict";
import {
  DOMAIN, SOURCE, DEST, isHostingerMX, isCloudflareMX,
  hostingerOnlySPF, exactForwardRule, cutoverReady, canRemoveOldMX, run,
  state, isRootMX, routingSPFReady,
} from "../email-routing-cutover.mjs";

const verified = [{ email: DEST, verified: "2026-10-20T10:00:00Z" }];
const rule = {
  enabled: true,
  matchers: [{ type: "literal", field: "to", value: SOURCE }],
  actions: [{ type: "forward", value: [DEST] }],
};
const hostinger = { type:"MX", name:DOMAIN, content:"mx1.hostinger.com", id:"old1" };
const cf = { type:"MX", name:DOMAIN, content:"route1.mx.cloudflare.net", id:"cf1" };

test("blocks unverified destinations and missing/incorrect rules", () => {
  assert.equal(cutoverReady({ destinations:[{email:DEST,verified:null}], rules:[rule] }).ready, false);
  assert.equal(cutoverReady({ destinations:verified, rules:[] }).ready, false);
  assert.equal(cutoverReady({ destinations:verified, rules:[{...rule,actions:[{type:"drop"}]}] }).ready, false);
  assert.equal(cutoverReady({ destinations:verified, rules:[rule] }).ready, true);
});

test("rules match exactly one designated forwarding target and source", () => {
  assert.equal(exactForwardRule(rule), true);
  assert.equal(exactForwardRule({ ...rule, enabled:false }), false);
  assert.equal(exactForwardRule({ ...rule, actions:[{type:"forward",value:["someone-else@gmail.com"]}] }), false);
});

test("only verified Cloudflare MX allows retirement of Hostinger MX", () => {
  assert.equal(canRemoveOldMX({ routingEnabled:true, dns:[cf] }), false);
  assert.equal(canRemoveOldMX({ routingEnabled:false, dns:[cf, {...cf,content:"route2.mx.cloudflare.net"}] }), false);
  assert.equal(canRemoveOldMX({ routingEnabled:true, dns:[cf,{...cf,content:"route2.mx.cloudflare.net"}] }), true);
});

test("legacy selectors target only Hostinger records for this domain", () => {
  assert.equal(isHostingerMX(hostinger), true);
  assert.equal(isHostingerMX({ ...hostinger, name:"other.app" }), false);
  assert.equal(isHostingerMX({ ...hostinger, content:"mx1.example.org" }), false);
  assert.equal(isCloudflareMX(cf), true);
  assert.equal(hostingerOnlySPF({type:"TXT",name:DOMAIN,content:"v=spf1 include:_spf.mail.hostinger.com ~all"}),true);
  assert.equal(hostingerOnlySPF({type:"TXT",name:DOMAIN,content:"v=spf1 include:mailgun.org ~all"}),false);
});

test("fails closed when Cloudflare authentication is unavailable", async () => {
  await assert.rejects(run("status", ""), /CLOUDFLARE_API_TOKEN_NOT_AVAILABLE/);
});

test("rejects extra routing actions, extra matchers and duplicate MX servers", () => {
  assert.equal(exactForwardRule({ ...rule, actions: [...rule.actions, { type: "drop" }] }), false);
  assert.equal(exactForwardRule({ ...rule, matchers: [...rule.matchers, { type: "all" }] }), false);
  assert.equal(canRemoveOldMX({ routingEnabled: true, dns: [cf, { ...cf, content: "ROUTE1.MX.CLOUDFLARE.NET." }] }), false);
});

test("full-zone DNS preserves Resend subdomain MX and requires one root SPF", () => {
  const resend = { type: "MX", name: "send.chatvice.app", content: "feedback-smtp.ap-northeast-1.amazonses.com" };
  const spf = { type: "TXT", name: DOMAIN, content: "v=spf1 include:_spf.mx.cloudflare.net ~all" };
  assert.equal(isRootMX(resend), false);
  assert.equal(isRootMX(hostinger), true);
  assert.equal(routingSPFReady([resend, spf]), true);
  assert.equal(routingSPFReady([spf, { ...spf, content: "v=spf1 include:_spf.mail.hostinger.com ~all" }]), false);
  assert.equal(routingSPFReady([{ ...spf, content: "v=spf1 include:_spf.mx.cloudflare.net.evil.example ~all" }]), false);
});

test("state reads every DNS page without an apex-only filter", async () => {
  const calls = [];
  const api = async (method, endpoint) => {
    calls.push(endpoint);
    if (endpoint.startsWith("/zones?")) return { result: [{ id: "zone", name: DOMAIN, account: { id: "account" } }] };
    if (endpoint === "/zones/zone/email/routing") return { result: { enabled: false } };
    if (endpoint.includes("/dns_records")) {
      assert.equal(new URL("https://api.example" + endpoint).searchParams.has("name"), false);
      return endpoint.endsWith("page=1")
        ? { result: [hostinger], result_info: { total_pages: 2 } }
        : { result: [{ type: "MX", name: "send.chatvice.app", content: "resend.example" }], result_info: { total_pages: 2 } };
    }
    return { result: [], result_info: { total_pages: 1 } };
  };
  const result = await state("test-token", api);
  assert.equal(result.dns.length, 2);
  assert.equal(result.dns[1].name, "send.chatvice.app");
  assert.equal(calls.filter(x => x.includes("/dns_records")).length, 2);
});

test("state surfaces routing read failures instead of treating them as disabled", async () => {
  const api = async (method, endpoint) => {
    if (endpoint.startsWith("/zones?")) return { result: [{ id: "zone", name: DOMAIN, account: { id: "account" } }] };
    if (endpoint === "/zones/zone/email/routing") throw new Error("routing permission denied");
    return { result: [] };
  };
  await assert.rejects(state("test-token", api), /routing permission denied/);
});
