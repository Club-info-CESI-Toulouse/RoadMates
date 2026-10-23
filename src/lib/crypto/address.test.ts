import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { encrypt, decrypt } = await import("./address");

beforeAll(() => {
  process.env.ADDRESS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("address encryption", () => {
  const address = { label: "1 rue de la Paix, Paris", lat: 48.87, lon: 2.33 };

  it("round-trips with a versioned, non-deterministic payload", () => {
    const a = encrypt(address);
    expect(a.startsWith("v1:")).toBe(true);
    expect(a).not.toContain("Paix");
    expect(encrypt(address)).not.toBe(a);
    expect(decrypt(a)).toEqual(address);
  });

  it("rejects tampered payloads and unknown versions", () => {
    const a = encrypt(address);
    const tampered = a.slice(0, -2) + (a.endsWith("A") ? "BB" : "AA");
    expect(() => decrypt(tampered)).toThrow();
    expect(() => decrypt(a.replace("v1:", "v9:"))).toThrow();
  });
});
