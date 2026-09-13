import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import {
  parseShopInput,
  resolveAdminHost,
} from "../app/integration/shopify/domain";

describe("parseShopInput", () => {
  test("bare handle becomes the myshopify admin host", () => {
    expect(parseShopInput("acmestore")).toEqual({
      kind: "admin",
      host: "acmestore.myshopify.com",
    });
    expect(parseShopInput("  Acme-Store  ")).toEqual({
      kind: "admin",
      host: "acme-store.myshopify.com",
    });
  });

  test("myshopify admin hosts pass through, with or without a URL wrapper", () => {
    expect(parseShopInput("acmestore.myshopify.com")).toEqual({
      kind: "admin",
      host: "acmestore.myshopify.com",
    });
    expect(parseShopInput("https://ACMESTORE.myshopify.com/admin")).toEqual({
      kind: "admin",
      host: "acmestore.myshopify.com",
    });
  });

  test("custom storefront domains are a lookup, not a suffix", () => {
    expect(parseShopInput("mijaofficial.com")).toEqual({
      kind: "storefront",
      origin: "https://mijaofficial.com",
    });
    expect(parseShopInput("https://www.mijaofficial.com/products/tee")).toEqual(
      {
        kind: "storefront",
        origin: "https://www.mijaofficial.com",
      },
    );
  });

  test("does not invent brand.com.myshopify.com", () => {
    expect(parseShopInput("mijaofficial.com.myshopify.com")).toBeNull();
  });

  test("refuses credentials, IPs, and empty input", () => {
    expect(parseShopInput("")).toBeNull();
    expect(parseShopInput("https://user:secret@brand.com")).toBeNull();
    expect(parseShopInput("10.0.0.1")).toBeNull();
  });
});

describe("resolveAdminHost", () => {
  const fetchSpy = spyOn(globalThis, "fetch");

  beforeEach(() => {
    fetchSpy.mockReset();
  });

  afterEach(() => {
    fetchSpy.mockReset();
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  const meta = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  test("does not fetch for a handle or myshopify host", async () => {
    expect(await resolveAdminHost("acmestore")).toBe("acmestore.myshopify.com");
    expect(await resolveAdminHost("acmestore.myshopify.com")).toBe(
      "acmestore.myshopify.com",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("reads the real admin host from a custom domain's /meta.json", async () => {
    fetchSpy.mockResolvedValueOnce(
      meta({
        id: 74790764741,
        myshopify_domain: "dibryq-nu.myshopify.com",
      }),
    );

    expect(await resolveAdminHost("mijaofficial.com")).toBe(
      "dibryq-nu.myshopify.com",
    );
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "https://mijaofficial.com/meta.json",
    );
  });

  test("rejects a /meta.json that names a non-admin host", async () => {
    fetchSpy.mockResolvedValueOnce(
      meta({
        id: 1,
        myshopify_domain: "brand.com",
      }),
    );

    expect(await resolveAdminHost("brand.com")).toBeNull();
  });

  test("rejects a /meta.json that names brand.com.myshopify.com", async () => {
    fetchSpy.mockResolvedValueOnce(
      meta({
        id: 1,
        myshopify_domain: "brand.com.myshopify.com",
      }),
    );

    expect(await resolveAdminHost("brand.com")).toBeNull();
  });

  test("fails closed when /meta.json is missing or not Shopify", async () => {
    fetchSpy.mockResolvedValueOnce(meta({ error: "nope" }, 404));
    expect(await resolveAdminHost("not-a-shop.example")).toBeNull();

    fetchSpy.mockResolvedValueOnce(meta({ name: "Nope" }));
    expect(await resolveAdminHost("not-a-shop.example")).toBeNull();
  });
});
