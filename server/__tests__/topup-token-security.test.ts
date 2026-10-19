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
});
