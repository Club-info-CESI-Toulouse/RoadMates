import { describe, expect, it } from "vitest";
import { codeSchema, emailSchema, resetPasswordSchema, signUpSchema } from "./schema";

const valid = {
  email: "Jean.Dupont@viacesi.fr ",
  password: "motdepasse",
  passwordConfirm: "motdepasse",
  displayName: " Jean ",
};

describe("emailSchema", () => {
  it("accepts and normalizes @viacesi.fr", () => {
    expect(emailSchema.parse(" A.B@VIACESI.FR")).toBe("a.b@viacesi.fr");
  });
  it.each(["a@gmail.com", "a@viacesi.fr.evil.com", "a@sub.viacesi.fr", "viacesi.fr"])(
    "rejects %s",
    (email) => expect(emailSchema.safeParse(email).success).toBe(false),
  );
});

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    expect(signUpSchema.parse(valid)).toMatchObject({
      email: "jean.dupont@viacesi.fr",
      displayName: "Jean",
    });
  });
  it("rejects mismatched passwords", () => {
    const r = signUpSchema.safeParse({ ...valid, passwordConfirm: "autre" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["passwordConfirm"]);
  });
  it("rejects short passwords and blank names", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "a", passwordConfirm: "a" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, displayName: "x".repeat(41) }).success).toBe(false);
  });
});

describe("codeSchema", () => {
  it("accepts 6 digits only", () => {
    expect(codeSchema.parse(" 123456 ")).toBe("123456");
    expect(codeSchema.safeParse("12345").success).toBe(false);
    expect(codeSchema.safeParse("12a456").success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const base = { code: "123456", password: "nouveaumdp", passwordConfirm: "nouveaumdp" };
    expect(resetPasswordSchema.safeParse(base).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, passwordConfirm: "x" }).success).toBe(false);
  });
});
