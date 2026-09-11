import { afterEach, describe, expect, test } from "bun:test";
import { type Entry, parseEntry } from "@/lib/redirect";
import { resolveOrigin } from "../utils/ssrf";

describe("resolveOrigin", () => {
  const environment = process.env.NODE_ENV;

  afterEach(() => {
    Reflect.set(process.env, "NODE_ENV", environment);
  });

  test("accepts what a merchant actually types", () => {
    expect(resolveOrigin("acme.com")).toEqual({
      origin: "https://acme.com",
      host: "acme.com",
    });
    expect(
      resolveOrigin("  https://www.Acme.com/products/tee?variant=1  "),
    ).toEqual({
      origin: "https://www.acme.com",
      host: "acme.com",
    });
    expect(resolveOrigin("shop.acme.co.uk/")).toEqual({
      origin: "https://shop.acme.co.uk",
      host: "shop.acme.co.uk",
    });
  });

  test("refuses anything that is not a storefront host", () => {
    expect(resolveOrigin("")).toBeNull();
    expect(resolveOrigin("acme")).toBeNull();
    expect(resolveOrigin("localhost")).toBeNull();
    expect(resolveOrigin("10.0.0.1")).toBeNull();
    expect(resolveOrigin("https://192.168.1.10/admin")).toBeNull();
    expect(resolveOrigin("ftp://acme.com")).toBeNull();
    expect(resolveOrigin("https://user:secret@acme.com")).toBeNull();
    expect(resolveOrigin("not a url at all")).toBeNull();
  });

  test("production speaks https on the default port", () => {
    Reflect.set(process.env, "NODE_ENV", "production");

    expect(resolveOrigin("http://acme.com:8080/")?.origin).toBe(
      "https://acme.com",
    );
  });

  test("development keeps scheme and port for local test stores", () => {
    Reflect.set(process.env, "NODE_ENV", "development");

    expect(resolveOrigin("http://ecentic-test.local:8080")?.origin).toBe(
      "http://ecentic-test.local:8080",
    );
  });
});

describe("parseEntry", () => {
  const entry: Entry = {
    origin: "https://acme.com",
    host: "acme.com",
    platform: "shopify",
    name: "Acme",
    products: 124,
    status: "pending",
  };

  test("reads the cookie the hero wrote", () => {
    expect(parseEntry(JSON.stringify(entry))).toEqual(entry);
  });

  test("treats a missing or tampered cookie as no entry", () => {
    expect(parseEntry(undefined)).toBeNull();
    expect(parseEntry("not json")).toBeNull();
    expect(
      parseEntry(JSON.stringify({ ...entry, status: "imported" })),
    ).toBeNull();
    expect(
      parseEntry(JSON.stringify({ ...entry, origin: "javascript:alert(1)" })),
    ).toBeNull();
    expect(
      parseEntry(JSON.stringify({ ...entry, platform: "magento" })),
    ).toBeNull();
  });
});
