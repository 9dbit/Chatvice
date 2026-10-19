import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { getTopupJwtSecret } from "../topupTokenSecurity";

describe("top-up JWT security", () => {
  const strong = "0123456789abcdef".repeat(5);

  it("fails closed when the signing key is absent, blank, weak or malformed", () => {
    expect(getTopupJwtSecret({})).toBeNull();
    expect(getTopupJwtSecret({ JWT_SECRET: "" })).toBeNull();
    expect(getTopupJwtSecret({ JWT_SECRET: "x".repeat(30) })).toBeNull();
    expect(getTopupJwtSecret({ JWT_SECRET: strong + " " })).toBeNull();
  });

  it("preserves the configured signing secret unchanged", () => {
    expect(getTopupJwtSecret({ JWT_SECRET: strong })).toBe(strong);
  });

  it("requires HS256 and a 30-minute lifetime for top-up sessions", () => {
    const secret = getTopupJwtSecret({ JWT_SECRET: strong })!;
    const token = jwt.sign(
      { type: "topup_session", site_id: "test" },
      secret,
      { algorithm: "HS256", expiresIn: "30m" },
    );
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(header.alg).toBe("HS256");
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    expect(decoded.type).toBe("topup_session");
    expect(decoded.exp! - decoded.iat!).toBe(30 * 60);
    expect(() => jwt.verify(token, "wrong", { algorithms: ["HS256"] })).toThrow();
  });
  it("rejects expired, tampered and unsupported-algorithm top-up tokens", () => {
    const secret = getTopupJwtSecret({ JWT_SECRET: strong })!;
    const payload = { type: "topup_session", merchant_id: "merchant-a", site_id: "site-a" };
    const valid = jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "30m" });
    expect(() => jwt.verify(valid, secret, { algorithms: ["HS256"] })).not.toThrow();

    const expired = jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: -1 });
    expect(() => jwt.verify(expired, secret, { algorithms: ["HS256"] })).toThrow(jwt.TokenExpiredError);

    const [header, encodedPayload, signature] = valid.split(".");
    const changedPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    changedPayload.merchant_id = "merchant-b";
    const tampered = [header, Buffer.from(JSON.stringify(changedPayload)).toString("base64url"), signature].join(".");
    expect(() => jwt.verify(tampered, secret, { algorithms: ["HS256"] })).toThrow(jwt.JsonWebTokenError);

    const wrongAlgorithm = jwt.sign(payload, secret, { algorithm: "HS384", expiresIn: "30m" });
    expect(() => jwt.verify(wrongAlgorithm, secret, { algorithms: ["HS256"] })).toThrow(jwt.JsonWebTokenError);

    const unsigned = jwt.sign(payload, "", { algorithm: "none" });
    expect(() => jwt.verify(unsigned, secret, { algorithms: ["HS256"] })).toThrow(jwt.JsonWebTokenError);
  });

});
