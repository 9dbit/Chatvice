import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { readFileSync } from "node:fs";
import { registerWelcomeBubbleRoutes } from "../welcomeBubbleRoutes";
import { welcomeBubblePromoScript } from "../welcomeBubblePromoScript";
import { safePromoLink } from "@shared/welcomeBubble";

function fixture() {
  const app = express();
  app.use(express.json());
  const rows: Record<string, any> = {};
  const storage = {
    getWelcomeBubble: vi.fn(async (id: string) => rows[id]),
    upsertWelcomeBubble: vi.fn(async (id: string, data: any) => rows[id] = { ...rows[id], ...data, merchantId: id }),
  };
  registerWelcomeBubbleRoutes(app, { storage, requireMerchant: (req, res, next) => {
    if (!req.headers["x-merchant"]) return res.sendStatus(401);
    (req as any).session = { merchantId: req.headers["x-merchant"] }; next();
  }, resolveMerchant: async id => id === "public-one" ? { id: "one" } : null });
  return { app, storage };
}
describe("Welcome bubble persistence and validation", () => {
  it.each(["chat", "url", "none"])("persists %s action through dashboard and public widget reads", async action => {
    const { app } = fixture();
    const expected = { promoClickAction: action, promoClickUrl: action === "url" ? "https://example.test/promo?a=1&b=2" : "" };
    await request(app).put("/api/welcome-bubble").set("x-merchant", "one").send({ ...expected, promoImageEnabled: true, promoImageUrl: "/promo.mp4", isEnabled: true }).expect(200);
    expect((await request(app).get("/api/welcome-bubble").set("x-merchant", "one")).body).toMatchObject(expected);
    const publicRead = await request(app).get("/api/widget/public-one/welcome-bubble").expect(200);
    expect(publicRead.body).toMatchObject(expected);
    expect(publicRead.headers["cache-control"]).toBe("no-store");
    await request(app).put("/api/welcome-bubble").set("x-merchant", "one").send({ headline: "Changed" }).expect(200);
    expect((await request(app).get("/api/welcome-bubble").set("x-merchant", "one")).body).toMatchObject(expected);
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "//example.test", "https://user:secret@example.test", "https://example.test/\n", "", "ftp://example.test", "https://example.test/" + "x".repeat(2048)])("rejects unsafe destination %s", async url => {
    const { app, storage } = fixture();
    await request(app).put("/api/welcome-bubble").set("x-merchant", "one").send({ promoClickAction: "url", promoClickUrl: url }).expect(400);
    expect(storage.upsertWelcomeBubble).not.toHaveBeenCalled();
    expect(safePromoLink(url)).toBeNull();
  });
  it("requires authentication and prevents merchant/ID injection", async () => {
    const { app, storage } = fixture();
    await request(app).put("/api/welcome-bubble").send({}).expect(401);
    await request(app).get("/api/welcome-bubble").expect(401);
    for (const body of [{ merchantId: "other" }, { id: "other" }, { promoClickAction: "invalid" }]) {
      await request(app).put("/api/welcome-bubble").set("x-merchant", "one").send(body).expect(400);
    }
    expect(storage.upsertWelcomeBubble).not.toHaveBeenCalled();
    expect((await request(app).get("/api/widget/missing/welcome-bubble")).body).toEqual({ isEnabled: false });
  });
});

const renderPromo = new Function("document", "URL", welcomeBubblePromoScript + "; return renderWelcomePromo;")(document, URL);
function promo(action = "none", url = "https://example.test/promo", media = "/promo.png") {
  const host = document.createElement("div"); document.body.append(host);
  const openChat = vi.fn();
  renderPromo(host, { promoImageEnabled: true, promoImageUrl: media, promoClickAction: action, promoClickUrl: url }, "https://chatvice.test", openChat);
  return { host, openChat };
}
afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });
describe("Embedded widget promo actions", () => {
  it.each(["/promo.png", "/promo.mp4?version=2"])("opens URL for %s with safe anchor semantics", media => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { host, openChat } = promo("url", "https://example.test/promo?a=1&b=2", media);
    const link = host.querySelector("a")!;
    expect(link.href).toBe("https://example.test/promo?a=1&b=2");
    expect(link.target).toBe("_blank"); expect(link.rel).toBe("noopener noreferrer");
    expect(link.getAttribute("aria-label")).toBe("Open promotion (new tab)");
    expect(openChat).not.toHaveBeenCalled();
  });
  it.each(["/promo.png", "/promo.mp4"])("opens chat from %s", media => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { host, openChat } = promo("chat", "", media);
    host.querySelector<HTMLButtonElement>('button[aria-label="Open chat"]')!.click();
    expect(openChat).toHaveBeenCalledOnce();
  });
  it("leaves existing or unsafe media targets non-interactive and never inserts URL HTML", () => {
    expect(promo().host.querySelector("a,button")).toBeNull();
    expect(promo("url", "javascript:alert(1)").host.querySelector("a")).toBeNull();
    const { host } = promo("url", 'https://example.test/\" onclick=\"alert(1)', '/promo.png?x=" onerror="alert(1)');
    expect(host.querySelector("a")?.getAttribute("onclick")).toBeNull();
    expect(host.querySelector("img")?.getAttribute("onerror")).toBeNull();
  });
  it("keeps Safari play fallback separate from the navigation action", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValueOnce(new Error("NotAllowedError")).mockResolvedValue();
    const { host, openChat } = promo("chat", "", "/promo.mp4");
    await Promise.resolve();
    const fallback = [...host.querySelectorAll("button")].find(b => b.textContent === "Play video")!;
    expect(fallback.style.display).toBe("block");
    expect(fallback.parentElement).toBe(host);
    fallback.click(); expect(play).toHaveBeenCalledTimes(2); expect(openChat).not.toHaveBeenCalled();
    const video = host.querySelector("video")!;
    expect(video.muted && video.defaultMuted && video.playsInline && video.loop).toBe(true);
    video.dispatchEvent(new Event("playing")); expect(fallback.style.display).toBe("none");
  });
  it("uses a pill CTA and the same open/hide handlers for CTA and media", () => {
    const routes = readFileSync("server/routes.ts", "utf8");
    const line = routes.split("\n").find(l => l.includes('contentHtml +=') && l.includes('id="chatvice-cta-btn"'))!;
    const html = new Function("config", "buttonPadding", "buttonFontSize", `var contentHtml=''; ${line}; return contentHtml;`)({}, "8px 13px", 14);
    const host = document.createElement("div"); host.innerHTML = html + '<div id="chatvice-promo-media"></div>';
    const handlers = routes.slice(routes.indexOf("    function openBubbleChat()"), routes.indexOf("    var minimizeBtn =", routes.indexOf("    function openBubbleChat()")));
    const open = vi.fn(), hide = vi.fn();
    new Function("welcomeBubbleContent", "config", "baseUrl", "renderWelcomePromo", "openWidget", "hideWelcomeBubble", handlers)(host, { promoImageEnabled: true, promoImageUrl: "/promo.png", promoClickAction: "chat" }, "https://chatvice.test", renderPromo, open, hide);
    const cta = host.querySelector<HTMLButtonElement>("#chatvice-cta-btn")!;
    expect(cta.style.borderRadius).toBe("9999px"); cta.click();
    host.querySelector<HTMLButtonElement>('button[aria-label="Open chat"]')!.click();
    expect(open).toHaveBeenCalledTimes(2); expect(hide).toHaveBeenCalledTimes(2);
  });
});
