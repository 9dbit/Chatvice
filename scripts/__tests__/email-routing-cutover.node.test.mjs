import test from "node:test";
import assert from "node:assert/strict";
import {
  DOMAIN, SOURCE, DEST, isHostingerMX, isCloudflareMX,
  hostingerOnlySPF, exactForwardRule, cutoverReady, canRemoveOldMX, run,
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
