import { describe, expect, test } from "bun:test";
import { sign, verify } from "./signature";

describe("sign / verify", () => {
  test("round-trip: verify(sign(payload)) returns the original payload", () => {
    const token = sign("hello", "secret");
    expect(verify(token, "secret")).toBe("hello");
  });

  test("tampered payload returns null", () => {
    const token = sign("hello", "secret");
    const [encoded, digest] = token.split(".");
    const tampered = `${encoded?.slice(0, -1)}X.${digest}`;
    expect(verify(tampered, "secret")).toBeNull();
  });

  test("tampered digest returns null", () => {
    const token = sign("hello", "secret");
    const [encoded, digest] = token.split(".");
    const tampered = `${encoded}.${digest?.slice(0, -1)}X`;
    expect(verify(tampered, "secret")).toBeNull();
  });

  test("wrong secret returns null", () => {
    const token = sign("hello", "secret");
    expect(verify(token, "wrong-secret")).toBeNull();
  });

  test("token without separator returns null", () => {
    expect(verify("nodothere", "secret")).toBeNull();
  });

  test("empty payload round-trips", () => {
    const token = sign("", "secret");
    expect(verify(token, "secret")).toBe("");
  });
});
