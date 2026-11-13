import { describe, expect, test } from "bun:test";
import { ucpDiscoveryProfile } from "@/lib/agent-discovery";
import { LATEST_UCP_VERSION, UCP_REVISIONS, type UcpRevision } from "@/lib/ucp";
import * as Validator from "@/server/app/intelligence/ucp/validator";
import { UCP_VERSION } from "@/server/app/ucp/protocol";

/**
 * UCP revisions are dated snapshots that disagree with each other: where the
 * signing keys live, whether a capability must link its schema, which
 * characters a registry key may hold. A validator that reads every profile by
 * one revision's rules therefore reports faults a profile does not have — it
 * once told a live 2026-08-25 store that it was outdated, that
 * `dev.shopify.shop_pay` was not a reverse-domain name, and that its order
 * capability owed a webhook URL only a platform declares.
 *
 * So a profile is judged by the revision it declares, and a profile on a
 * revision with no rules here is not judged at all.
 */

/**
 * https://allbirds.com/.well-known/ucp as served on 2026-10-07 — a Shopify
 * store on 2026-08-25. Payment-handler `config` bodies are left out: they are
 * merchant settings the validator never reads. A dated release can be amended
 * in place, so this is the profile as published that day, not a moving target.
 */
const allbirds = {
  ucp: {
    version: "2026-08-25",
    supported_versions: {
      "2026-04-08":
        "https://weareallbirds.myshopify.com/.well-known/ucp/2026-04-08",
      "2026-01-23":
        "https://weareallbirds.myshopify.com/.well-known/ucp/2026-01-23",
    },
    services: {
      "dev.ucp.shopping": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/overview/",
          transport: "mcp",
          endpoint: "https://weareallbirds.myshopify.com/api/ucp/mcp",
          schema:
            "https://ucp.dev/2026-08-25/services/shopping/mcp.openrpc.json",
        },
        {
          version: "2026-04-08",
          spec: "https://ucp.dev/2026-04-08/specification/overview/",
          transport: "embedded",
          schema:
            "https://ucp.dev/2026-04-08/services/shopping/embedded.openrpc.json",
        },
      ],
    },
    capabilities: {
      "dev.ucp.shopping.checkout": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/checkout/",
          schema: "https://ucp.dev/2026-08-25/schemas/shopping/checkout.json",
        },
      ],
      "dev.ucp.shopping.fulfillment": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/extensions/fulfillment/",
          schema:
            "https://ucp.dev/2026-08-25/schemas/shopping/fulfillment.json",
          extends: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"],
          requires: { protocol: { min: "2026-08-25" } },
          config: {
            multi_destination: [],
            method_combinations: [["shipping"]],
          },
        },
      ],
      "dev.ucp.shopping.discount": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/extensions/discount/",
          schema: "https://ucp.dev/2026-08-25/schemas/shopping/discount.json",
          extends: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"],
          requires: { protocol: { min: "2026-08-25" } },
        },
      ],
      "dev.ucp.shopping.cart": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/cart/",
          schema: "https://ucp.dev/2026-08-25/schemas/shopping/cart.json",
        },
      ],
      "dev.ucp.shopping.order": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/order/",
          schema: "https://ucp.dev/2026-08-25/schemas/shopping/order.json",
        },
      ],
      "dev.ucp.shopping.catalog.search": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/catalog/",
          schema:
            "https://ucp.dev/2026-08-25/schemas/shopping/catalog_search.json",
        },
      ],
      "dev.ucp.shopping.catalog.lookup": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/shopping/catalog/",
          schema:
            "https://ucp.dev/2026-08-25/schemas/shopping/catalog_lookup.json",
        },
      ],
      "dev.shopify.catalog": [
        {
          version: "2026-08-25",
          spec: "https://shopify.dev/docs/agents/catalog/storefront-catalog",
          schema:
            "https://shopify.dev/ucp/schemas/2026-08-25/shopify_catalog.json",
          extends: [
            "dev.ucp.shopping.catalog.search",
            "dev.ucp.shopping.catalog.lookup",
          ],
          requires: { protocol: { min: "2026-08-25" } },
        },
      ],
      "dev.ucp.common.identity_linking": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/common/identity-linking/",
          schema:
            "https://ucp.dev/2026-08-25/schemas/common/identity_linking.json",
          config: {
            providers: {
              "app.shop.accounts": [
                { type: "oauth2", auth_url: "https://accounts.shop.app" },
              ],
            },
            scopes: {},
          },
        },
      ],
      "dev.ucp.shopping.permalink": [
        {
          version: "2026-08-25",
          spec: "https://ucp.dev/2026-08-25/specification/permalink/",
          schema: "https://ucp.dev/2026-08-25/schemas/shopping/permalink.json",
          config: { endpoint: "https://www.allbirds.com/buy" },
        },
      ],
    },
    payment_handlers: {
      "com.google.pay": [
        {
          id: "gpay",
          version: "2026-01-11",
          spec: "https://pay.google.com/gp/p/ucp/2026-01-11/",
          schema:
            "https://pay.google.com/gp/p/ucp/2026-01-11/schemas/config.json",
        },
      ],
      "dev.shopify.card": [
        {
          id: "shopify.card",
          version: "2026-01-15",
          spec: "https://ucp.dev/specification/payment-handler-guide",
          schema:
            "https://shopify.dev/ucp/card-payment-handler/2026-01-15/config.json",
        },
      ],
      "dev.shopify.shop_pay": [
        {
          id: "shop_pay",
          version: "2026-04-08",
          spec: "https://shopify.dev/ucp/shop-pay-handler/2026-04-08/spec.md",
          schema:
            "https://shopify.dev/ucp/shop-pay-handler/2026-04-08/schema.json",
        },
      ],
    },
  },
};

const capability = (version: string, name: string) => ({
  version,
  spec: `https://ucp.dev/${version}/specification/${name}`,
  schema: `https://ucp.dev/${version}/schemas/shopping/${name}.json`,
});

/**
 * A business profile with nothing wrong with it under either implemented
 * revision, so each case below changes one thing and reads off one finding.
 */
const profile = (
  version: string,
  ucp: Record<string, unknown> = {},
  beside: Record<string, unknown> = {},
) => ({
  ucp: {
    version,
    services: {
      "dev.ucp.shopping": [
        {
          version,
          transport: "rest",
          endpoint: "https://store.example.com/ucp",
          schema: `https://ucp.dev/${version}/services/shopping/rest.openapi.json`,
        },
      ],
    },
    capabilities: {
      "dev.ucp.shopping.checkout": [capability(version, "checkout")],
      "dev.ucp.shopping.cart": [capability(version, "cart")],
      "dev.ucp.shopping.order": [capability(version, "order")],
    },
    payment_handlers: {},
    ...ucp,
  },
  ...beside,
});

const ecKey = {
  kid: "business_2026",
  kty: "EC",
  crv: "P-256",
  x: "qIVYZVLCrPZHGHjP17CTW0_-D9Lfw0EkjqF7xB4FivA",
  y: "Mc4nN9LTDOBhfoUeg8Ye9WedFRhnZXZJA12Qp0zZ6F0",
  use: "sig",
  alg: "ES256",
};

const okpKey = {
  kid: "poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U",
  kty: "OKP",
  crv: "Ed25519",
  x: "JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs",
  use: "sig",
  alg: "EdDSA",
};

const errors = (validation: Validator.ValidationOutput) =>
  validation.issues.filter((issue) => issue.severity === "error");

const at = (validation: Validator.ValidationOutput, field: string) =>
  validation.issues.filter((issue) => issue.field === field);

describe("the revisions the validator knows", () => {
  test("the latest is the newest one it implements", () => {
    expect(UCP_REVISIONS.at(-1)).toBe(LATEST_UCP_VERSION);
    expect([...UCP_REVISIONS].sort()).toEqual([...UCP_REVISIONS]);
  });

  /**
   * The validator follows the published spec; ecentic's own endpoints speak
   * `UCP_VERSION` until they are ported. The two may differ, but the validator
   * must never be unable to read the revision we serve ourselves.
   */
  test("they include the revision ecentic's own endpoints serve", () => {
    expect(UCP_REVISIONS as readonly string[]).toContain(UCP_VERSION);
    expect(ucpDiscoveryProfile.ucp.version).toBe(UCP_VERSION);
  });
});

describe("a live profile on the latest revision", () => {
  const validation = Validator.validateUcpSpec(allbirds);

  test("is read against the revision it declares", () => {
    expect(validation.ucpVersion).toBe("2026-08-25");
    expect(validation.validatedAgainst).toBe("2026-08-25");
    expect(validation.isLatestVersion).toBe(true);
    expect(validation.envelopeKind).toBe("wrapped");
  });

  test("is not called outdated, mis-named, or badly wrapped", () => {
    const categories = validation.issues.map((issue) => issue.category);
    const messages = validation.issues.map((issue) => issue.message).join("\n");

    expect(categories).not.toContain("version");
    expect(categories).not.toContain("envelope");
    expect(messages).not.toContain("reverse-domain");
    expect(messages).not.toContain("webhook_url");
  });

  test("keeps every entry it declares, underscored names included", () => {
    expect(validation.services).toHaveLength(2);
    expect(validation.capabilities).toHaveLength(10);
    expect(validation.capabilities.map((entry) => entry.name)).toContain(
      "dev.ucp.common.identity_linking",
    );
    expect(
      validation.paymentHandlers.map((entry) => entry.registryKey),
    ).toEqual(["com.google.pay", "dev.shopify.card", "dev.shopify.shop_pay"]);
  });

  /**
   * What is left is true of the profile under its own revision: the embedded
   * binding still declares the previous release, and 2026-08-25 has platforms
   * drop any dev.ucp.* entry that does not repeat the profile's version.
   */
  test("is left with the one fault it actually has", () => {
    expect(errors(validation).map((issue) => issue.field)).toEqual([
      "services.dev.ucp.shopping[1].version",
    ]);
  });

  /**
   * com.google.pay is served from pay.google.com, whose labels reversed are
   * the name itself; dev.shopify.shop_pay from shopify.dev and the dev.ucp.*
   * entries from ucp.dev, whose labels reversed lead the name. dev.shopify.card
   * documents itself on ucp.dev, which is its right: `spec` is not bound in
   * 2026-08-25.
   */
  test("has every schema served by the owner of its name", () => {
    expect(
      validation.issues.filter((issue) =>
        /\.(?:spec|schema)$/.test(issue.field),
      ),
    ).toEqual([]);
  });
});

describe("a profile on a revision the validator has no rules for", () => {
  const unjudged = (
    version: string,
    validation: Validator.ValidationOutput,
  ) => {
    expect(validation.ucpVersion).toBe(version);
    expect(validation.validatedAgainst).toBeNull();
    expect(validation.isLatestVersion).toBe(false);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0]).toMatchObject({
      category: "version",
      severity: "warning",
      field: "version",
    });
    expect(validation.issues[0]?.message).toContain(
      "not validated against this revision",
    );
  };

  test("a newer one is reported as not validated, not as outdated", () => {
    unjudged(
      "2027-01-15",
      Validator.validateUcpSpec({
        ucp: { ...allbirds.ucp, version: "2027-01-15" },
      }),
    );
  });

  test("so is an older one that was never implemented", () => {
    unjudged("2026-01-23", Validator.validateUcpSpec(profile("2026-01-23")));
  });

  /** Everything here is a fault under both implemented revisions. */
  test("nothing in it is judged by another revision's rules", () => {
    unjudged(
      "2027-01-15",
      Validator.validateUcpSpec({
        version: "2027-01-15",
        services: { Shopping: [{ transport: "carrier-pigeon" }] },
        capabilities: { "dev.ucp.shopping.checkout": [{ version: "soon" }] },
        payment_handlers: { "com.example.pay": [{}] },
        signing_keys: [{ kty: "EC", d: "private" }],
      }),
    );
  });

  test("what it declares is still listed", () => {
    const validation = Validator.validateUcpSpec({
      ucp: { ...allbirds.ucp, version: "2027-01-15" },
      keys: [ecKey],
    });

    expect(validation.services).toHaveLength(2);
    expect(validation.capabilities).toHaveLength(10);
    expect(validation.paymentHandlers).toHaveLength(3);
    expect(validation.supportedVersions).toHaveLength(2);
    expect(validation.signingKeysAdvertised).toBe(true);
    expect(validation.signingKeys).toHaveLength(1);
  });
});

describe("a profile with no usable version", () => {
  const unreadable = (
    validation: Validator.ValidationOutput,
    field: string,
  ) => {
    expect(validation.validatedAgainst).toBeNull();
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0]).toMatchObject({ severity: "error", field });
  };

  test("a missing version is the one thing reported", () => {
    unreadable(Validator.validateUcpSpec({ ucp: { services: {} } }), "version");
  });

  test("a version that is not a string", () => {
    unreadable(
      Validator.validateUcpSpec({ ucp: { version: 20260825 } }),
      "version",
    );
  });

  test("a version that is not a dated release", () => {
    const validation = Validator.validateUcpSpec(profile("draft"));

    unreadable(validation, "version");
    expect(validation.ucpVersion).toBe("draft");
  });

  test("a ucp member that is not an object", () => {
    unreadable(Validator.validateUcpSpec({ ucp: null }), "ucp");
    unreadable(Validator.validateUcpSpec({ ucp: "2026-08-25" }), "ucp");
  });

  test("a document that is not an object", () => {
    unreadable(Validator.validateUcpSpec([]), "(root)");
    unreadable(Validator.validateUcpSpec("ucp"), "(root)");
  });
});

describe("what each revision asks for", () => {
  test("a clean profile is clean under both", () => {
    for (const version of UCP_REVISIONS) {
      const validation = Validator.validateUcpSpec(profile(version));

      expect(validation.validatedAgainst).toBe(version);
      expect(errors(validation)).toEqual([]);
    }
  });

  test("an older implemented revision is validated, and said to be older", () => {
    const validation = Validator.validateUcpSpec(profile("2026-04-08"));

    expect(validation.isLatestVersion).toBe(false);
    expect(at(validation, "version")).toHaveLength(1);
    expect(at(validation, "version")[0]).toMatchObject({ severity: "warning" });
    expect(at(validation, "version")[0]?.message).toContain(
      "validated against that revision",
    );
  });

  test("registry keys follow the declared revision's pattern", () => {
    const named = (version: string, name: string) =>
      at(
        Validator.validateUcpSpec(
          profile(version, {
            payment_handlers: { [name]: [{ id: "handler", version }] },
          }),
        ),
        `payment_handlers.${name}`,
      );

    for (const version of UCP_REVISIONS) {
      expect(named(version, "dev.shopify.shop_pay")).toEqual([]);
      expect(named(version, "com.example.loyalty_gold")).toEqual([]);
      expect(named(version, "shop_pay")).toHaveLength(1);
      expect(named(version, "Com.Example.Pay")).toHaveLength(1);
    }

    // Hyphens, digit-led labels and punycode TLDs arrived with 2026-08-25.
    for (const name of [
      "com.example-shop.checkout",
      "com.2example.cart",
      "xn--p1ai.example.checkout",
    ]) {
      expect(named("2026-08-25", name)).toEqual([]);
      expect(named("2026-04-08", name)).toHaveLength(1);
    }

    expect(named("2026-08-25", "com.example-.pay")).toHaveLength(1);
  });

  test("2026-08-25 reads signing keys from top-level keys", () => {
    const published = Validator.validateUcpSpec(
      profile("2026-08-25", {}, { keys: [ecKey, okpKey] }),
    );
    expect(published.signingKeysAdvertised).toBe(true);
    expect(published.signingKeys).toHaveLength(2);
    expect(published.issues).toEqual([]);

    const stale = Validator.validateUcpSpec(
      profile("2026-08-25", {}, { signing_keys: [ecKey] }),
    );
    expect(stale.signingKeysAdvertised).toBe(false);
    expect(stale.signingKeys).toEqual([]);
    expect(at(stale, "signing_keys")).toHaveLength(1);
    expect(at(stale, "signing_keys")[0]).toMatchObject({ severity: "error" });

    // Present but not an array is a broken publication, not an absent one.
    const broken = Validator.validateUcpSpec(
      profile("2026-08-25", {}, { keys: null }),
    );
    expect(broken.signingKeysAdvertised).toBe(true);
    expect(errors(broken).map((issue) => issue.field)).toEqual(["keys"]);

    // Nested inside "ucp", where no 2026-08-25 verifier looks — whatever the
    // array is called.
    for (const field of ["keys", "signing_keys"]) {
      const nested = Validator.validateUcpSpec(
        profile("2026-08-25", { [field]: [ecKey] }),
      );
      expect(nested.signingKeysAdvertised).toBe(false);
      expect(errors(nested).map((issue) => issue.field)).toEqual([
        `ucp.${field}`,
      ]);
    }

    // The old array beside the canonical one is an ignored extra, not a fault.
    const both = Validator.validateUcpSpec(
      profile("2026-08-25", {}, { keys: [ecKey], signing_keys: [ecKey] }),
    );
    expect(both.issues).toEqual([]);
  });

  test("2026-04-08 reads them from signing_keys", () => {
    const published = Validator.validateUcpSpec(
      profile("2026-04-08", {}, { signing_keys: [ecKey], keys: [ecKey] }),
    );
    expect(published.signingKeysAdvertised).toBe(true);
    expect(published.signingKeys).toHaveLength(1);
    expect(errors(published)).toEqual([]);

    const mirrorOnly = Validator.validateUcpSpec(
      profile("2026-04-08", {}, { keys: [ecKey] }),
    );
    expect(mirrorOnly.signingKeysAdvertised).toBe(false);
    expect(at(mirrorOnly, "keys")[0]).toMatchObject({ severity: "error" });

    const nested = Validator.validateUcpSpec(
      profile("2026-04-08", { signing_keys: [ecKey] }),
    );
    expect(nested.signingKeys).toHaveLength(1);
    expect(errors(nested)).toEqual([]);
    expect(at(nested, "ucp.signing_keys")[0]).toMatchObject({
      severity: "warning",
    });
  });

  test("a capability must link its schema from 2026-08-25 on", () => {
    const bare = (version: string) =>
      at(
        Validator.validateUcpSpec(
          profile(version, {
            capabilities: {
              "dev.ucp.shopping.checkout": [{ version }],
              "dev.ucp.shopping.cart": [capability(version, "cart")],
              "dev.ucp.shopping.order": [capability(version, "order")],
            },
          }),
        ),
        "capabilities.dev.ucp.shopping.checkout[0].schema",
      );

    expect(bare("2026-08-25")).toHaveLength(1);
    expect(bare("2026-08-25")[0]).toMatchObject({ severity: "error" });
    expect(bare("2026-04-08")).toEqual([]);
  });

  test("2026-08-25 pins every dev.ucp.* entry to the profile's version", () => {
    const mixed = (version: string) =>
      Validator.validateUcpSpec(
        profile(version, {
          capabilities: {
            // An earlier release than either profile, so neither matches it.
            "dev.ucp.shopping.checkout": [capability("2026-01-23", "checkout")],
            "dev.ucp.shopping.cart": [capability(version, "cart")],
            "dev.ucp.shopping.order": [capability(version, "order")],
            // Third-party names and payment handlers version on their own.
            "com.example.loyalty": [
              {
                version: "2025-11-02",
                schema: "https://example.com/schemas/loyalty.json",
              },
            ],
          },
          payment_handlers: {
            "com.google.pay": [{ id: "gpay", version: "2026-01-11" }],
          },
        }),
      );

    expect(errors(mixed("2026-08-25")).map((issue) => issue.field)).toEqual([
      "capabilities.dev.ucp.shopping.checkout[0].version",
    ]);
    expect(errors(mixed("2026-04-08"))).toEqual([]);
  });
});

/**
 * An entry's `schema` has to be served by the party that owns its
 * reverse-domain name, so that nothing is published under a namespace its
 * author does not control. The owner is read off the URL's host: the host's
 * labels, reversed, are the whole name or its leading labels.
 */
describe("authority binding", () => {
  const registries = ["services", "capabilities", "payment_handlers"] as const;

  /**
   * The findings on the URLs of one entry: `name` declared in `registry`, with
   * nothing else about it to report under either revision.
   */
  const declared = (
    version: UcpRevision,
    registry: (typeof registries)[number],
    name: string,
    urls: { spec?: string; schema?: string },
  ) => {
    const validation = Validator.validateUcpSpec(
      profile(version, {
        [registry]: {
          [name]: [{ id: "entry", version, transport: "embedded", ...urls }],
        },
      }),
    );

    return {
      spec: at(validation, `${registry}.${name}[0].spec`),
      schema: at(validation, `${registry}.${name}[0].schema`),
    };
  };

  /** The table under "Derivation algorithm" in 2026-08-25, row for row. */
  const table = [
    { name: "dev.ucp.shopping.checkout", host: "ucp.dev", bound: true },
    {
      name: "dev.ucp.shopping.checkout",
      host: "shopping.ucp.dev",
      bound: true,
    },
    {
      name: "com.example.payments.installments",
      host: "example.com",
      bound: true,
    },
    { name: "com.example.pay", host: "pay.example.com", bound: true },
    { name: "com.example.pay", host: "example.com", bound: true },
    { name: "com.example.pay", host: "evil.example", bound: false },
    { name: "dev.ucp.shopping.checkout", host: "evil.example", bound: false },
    { name: "com.examplecorp.pay", host: "example.com", bound: false },
    { name: "com.example.pay", host: "cdn.example.com", bound: false },
  ];

  /** The table as the validator reads it for one registry of one revision. */
  const read = (version: UcpRevision, registry: (typeof registries)[number]) =>
    table.map(({ name, host }) => ({
      name,
      host,
      bound:
        declared(version, registry, name, {
          schema: `https://${host}/schema.json`,
        }).schema.length === 0,
    }));

  test("2026-08-25 holds every entry with a schema to the spec's nine cases", () => {
    for (const registry of registries)
      expect(read("2026-08-25", registry)).toEqual(table);
  });

  test("a failed binding is an error on the entry's schema, in plain words", () => {
    for (const registry of registries) {
      const { schema } = declared("2026-08-25", registry, "com.example.pay", {
        schema: "https://cdn.example.com/pay.json",
      });

      expect(schema).toMatchObject([
        {
          severity: "error",
          category: registry,
          field: `${registry}.com.example.pay[0].schema`,
        },
      ]);
      expect(schema[0]?.message).toContain('"cdn.example.com"');
      expect(schema[0]?.message).toContain('"com.example.cdn"');
    }
  });

  /**
   * The host is what a WHATWG parser reads, not a substring of the text, and
   * it has to be a domain name: an address or a lone label owns no namespace.
   */
  test("the host is the parser's, and a domain name of two labels", () => {
    const checkout = (schema: string) =>
      declared("2026-08-25", "capabilities", "dev.ucp.shopping.checkout", {
        schema,
      }).schema;

    for (const schema of [
      "https://ucp.dev/checkout.json",
      "HTTPS://UCP.DEV/checkout.json",
      "https://ucp.dev./checkout.json",
      "https://ucp.dev:8443/checkout.json",
    ])
      expect(checkout(schema)).toEqual([]);

    for (const schema of [
      // The spec's own example: this URL is served by evil.example.
      "https://ucp.dev@evil.example/checkout.json",
      // Userinfo is refused even in front of the right host.
      "https://user:secret@ucp.dev/checkout.json",
      "https://203.0.113.10/checkout.json",
      "https://[2001:db8::1]/checkout.json",
      "https://localhost/checkout.json",
      // Reversed, "dev" does lead the name; one label is still no authority.
      "https://dev/checkout.json",
      "https://ucp.dev../checkout.json",
      "https://ucp dev/checkout.json",
    ])
      expect(checkout(schema)).toMatchObject([{ severity: "error" }]);

    // An address is no authority even for a name spelled out of its digits.
    expect(
      declared("2026-08-25", "payment_handlers", "10.113.0.203.pay", {
        schema: "https://203.0.113.10/pay.json",
      }).schema,
    ).toMatchObject([{ severity: "error" }]);

    // An internationalized host is compared in its A-label form.
    expect(
      declared("2026-08-25", "capabilities", "example.xn--bcher-kva.loyalty", {
        schema: "https://bücher.example/loyalty.json",
      }).schema,
    ).toEqual([]);
  });

  test("a schema that is not https is reported once, as that", () => {
    for (const registry of registries) {
      const { schema } = declared("2026-08-25", registry, "com.example.pay", {
        schema: "http://example.com/pay.json",
      });

      expect(schema).toHaveLength(1);
      expect(schema[0]?.message).toContain("HTTPS");
    }
  });

  test("2026-08-25 leaves spec free of it, and an entry without a schema", () => {
    for (const registry of registries)
      expect(
        declared("2026-08-25", registry, "com.example.pay", {
          spec: "https://docs.example.org/pay",
          schema: "https://example.com/pay.json",
        }),
      ).toEqual({ spec: [], schema: [] });

    // A capability is left out: without a schema it has a fault of its own.
    for (const registry of ["services", "payment_handlers"] as const)
      expect(
        declared("2026-08-25", registry, "com.example.pay", {
          spec: "https://docs.example.org/pay",
        }),
      ).toEqual({ spec: [], schema: [] });
  });

  /**
   * 2026-04-08 words it differently — capabilities only, `spec` as well as
   * `schema`, and platforms SHOULD reject — and gives no derivation. So what
   * fails under every reading of it is reported, and as a warning.
   */
  test("2026-04-08 asks it of a capability's spec and schema, as a warning", () => {
    const stray = {
      spec: "https://docs.example.org/pay",
      schema: "https://cdn.example.com/pay.json",
    };

    expect(
      declared("2026-04-08", "capabilities", "com.example.pay", stray),
    ).toMatchObject({
      spec: [{ severity: "warning", category: "capabilities" }],
      schema: [{ severity: "warning", category: "capabilities" }],
    });
    expect(
      declared("2026-04-08", "capabilities", "com.example.pay", {
        spec: "https://example.com/pay",
        schema: "https://pay.example.com/pay.json",
      }),
    ).toEqual({ spec: [], schema: [] });
    expect(read("2026-04-08", "capabilities")).toEqual(table);

    for (const registry of ["services", "payment_handlers"] as const)
      expect(
        declared("2026-04-08", registry, "com.example.pay", stray),
      ).toEqual({ spec: [], schema: [] });
  });

  /** The handler both revisions print in their example profile. */
  test("the spec's own Google Pay handler binds under both revisions", () => {
    for (const version of UCP_REVISIONS)
      expect(
        declared(version, "payment_handlers", "com.google.pay", {
          spec: "https://developers.google.com/merchant/ucp/guides/gpay-payment-handler",
          schema:
            "https://pay.google.com/gp/p/ucp/2026-01-11/schemas/gpay_config.json",
        }),
      ).toEqual({ spec: [], schema: [] });
  });
});

describe("what every revision asks for", () => {
  const each = (assert: (version: UcpRevision) => void) => {
    for (const version of UCP_REVISIONS) assert(version);
  };

  test("the ucp member: a flat document is not a profile", () => {
    each((version) => {
      const validation = Validator.validateUcpSpec(profile(version).ucp);

      expect(validation.envelopeKind).toBe("flat");
      expect(validation.validatedAgainst).toBe(version);
      expect(errors(validation).map((issue) => issue.field)).toEqual(["ucp"]);
    });
  });

  test("the services and payment_handlers registries", () => {
    each((version) => {
      const validation = Validator.validateUcpSpec({ ucp: { version } });

      expect(errors(validation).map((issue) => issue.field)).toEqual([
        "services",
        "payment_handlers",
      ]);
    });
  });

  /**
   * `config.webhook_url` on the order capability is the platform's to declare:
   * it is where a business sends order events. A business has none to publish.
   */
  test("no webhook URL on a business's order capability", () => {
    each((version) => {
      expect(
        Validator.validateUcpSpec(profile(version)).capabilities,
      ).toContainEqual(
        expect.objectContaining({
          name: "dev.ucp.shopping.order",
          config: null,
        }),
      );
      expect(errors(Validator.validateUcpSpec(profile(version)))).toEqual([]);
    });
  });

  test("a binding's endpoint, but not its schema", () => {
    each((version) => {
      const validation = Validator.validateUcpSpec(
        profile(version, {
          services: {
            "dev.ucp.shopping": [
              // The spec's own business example: an Agent Card has no schema.
              {
                version,
                transport: "a2a",
                endpoint:
                  "https://store.example.com/.well-known/agent-card.json",
              },
              { version, transport: "embedded" },
              { version, transport: "mcp" },
              { version },
            ],
          },
        }),
      );

      expect(validation.services).toHaveLength(4);
      expect(errors(validation).map((issue) => issue.field)).toEqual([
        "services.dev.ucp.shopping[2].endpoint",
        "services.dev.ucp.shopping[3].transport",
        "services.dev.ucp.shopping[3].endpoint",
      ]);
    });
  });

  test("an id on every payment handler", () => {
    each((version) => {
      const validation = Validator.validateUcpSpec(
        profile(version, {
          payment_handlers: { "com.example.pay": [{ version }] },
        }),
      );

      expect(errors(validation).map((issue) => issue.field)).toEqual([
        "payment_handlers.com.example.pay[0].id",
      ]);
    });
  });
});

describe("values taken from the profile", () => {
  /** A value that refuses to become a string must not take the check down. */
  test("a status of the wrong shape is reported, not thrown on", () => {
    const validation = Validator.validateUcpSpec(
      profile(LATEST_UCP_VERSION, { status: { toString: null } }),
    );

    expect(errors(validation).map((issue) => issue.field)).toEqual(["status"]);
    expect(
      errors(
        Validator.validateUcpSpec(
          profile(LATEST_UCP_VERSION, { status: "pending" }),
        ),
      )[0]?.message,
    ).toContain('got "pending"');
  });
});

describe("names taken from the profile", () => {
  /**
   * The result crosses a server-action boundary, so every label in it has to
   * be plain text — including for a registry key that happens to name a member
   * every JavaScript object inherits.
   */
  test("a key named like an object member is an ordinary unknown name", () => {
    const entry = {
      id: "handler",
      version: LATEST_UCP_VERSION,
      transport: "embedded",
    };
    const entries = { constructor: [entry], toString: [entry] };
    const validation = Validator.validateUcpSpec(
      profile(LATEST_UCP_VERSION, {
        services: entries,
        capabilities: entries,
        payment_handlers: entries,
      }),
    );

    const listed = [
      ...validation.services,
      ...validation.capabilities,
      ...validation.paymentHandlers,
    ];

    expect(listed).toHaveLength(6);
    for (const entry of listed) {
      expect(typeof entry.label).toBe("string");
      expect(entry.recognized).toBe(false);
    }
  });
});

describe("signing keys", () => {
  const keyed = (...keys: Record<string, unknown>[]) =>
    Validator.validateUcpSpec(profile(LATEST_UCP_VERSION, {}, { keys }));

  test("the two shapes UCP defines pass", () => {
    expect(keyed(ecKey, okpKey).issues).toEqual([]);
  });

  /**
   * The key-type, curve and algorithm vocabularies are open: a verifier skips
   * a key it cannot use, it does not reject the profile that publishes it.
   */
  test("an unfamiliar key type or curve is allowed", () => {
    const validation = keyed(
      {
        kid: "rsa",
        kty: "RSA",
        n: "sXch",
        e: "AQAB",
        use: "sig",
        alg: "RS256",
      },
      { ...ecKey, kid: "koblitz", crv: "secp256k1", alg: "ES256K" },
    );

    expect(errors(validation)).toEqual([]);
    expect(validation.signingKeys).toHaveLength(2);
    expect(at(validation, "keys[0].kty")[0]).toMatchObject({
      severity: "warning",
    });
    expect(at(validation, "keys[1].crv")[0]).toMatchObject({
      severity: "warning",
    });
  });

  test("a key type named after an object method is just unfamiliar", () => {
    const validation = keyed({ kid: "odd", kty: "constructor", use: "sig" });

    expect(errors(validation)).toEqual([]);
  });

  test("a defined shape must be complete", () => {
    const { y: _y, ...withoutY } = ecKey;
    const { x: _x, ...withoutX } = okpKey;

    expect(errors(keyed(withoutY)).map((issue) => issue.field)).toEqual([
      "keys[0].y",
    ]);
    expect(errors(keyed(withoutX)).map((issue) => issue.field)).toEqual([
      "keys[0].x",
    ]);
    expect(
      errors(keyed({ kty: "EC", use: "sig", alg: "ES256" })).map(
        (issue) => issue.field,
      ),
    ).toEqual(["keys[0].kid", "keys[0].crv", "keys[0].x", "keys[0].y"]);
  });

  test("a stated algorithm must be the one its curve signs with", () => {
    expect(
      errors(keyed({ ...ecKey, alg: "ES384" })).map((issue) => issue.field),
    ).toEqual(["keys[0].alg"]);
    expect(
      errors(keyed({ ...okpKey, alg: "ES256" })).map((issue) => issue.field),
    ).toEqual(["keys[0].alg"]);
  });

  test("a curve must belong to the key type that carries it", () => {
    expect(
      errors(keyed({ ...ecKey, kty: "OKP" })).map((issue) => issue.field),
    ).toEqual(["keys[0].crv"]);
    expect(
      errors(keyed({ ...okpKey, kty: "EC", y: ecKey.y })).map(
        (issue) => issue.field,
      ),
    ).toEqual(["keys[0].crv"]);
  });

  test("private key material is never acceptable", () => {
    for (const member of ["d", "p", "q", "dp", "dq", "qi", "oth", "k"]) {
      const validation = keyed({ ...ecKey, [member]: "secret" });

      expect(validation.signingKeys[0]?.hasPrivateMaterial).toBe(true);
      expect(errors(validation).map((issue) => issue.field)).toEqual([
        "keys[0]",
      ]);
    }
  });

  test("a duplicate kid is ambiguous", () => {
    expect(errors(keyed(ecKey, ecKey)).map((issue) => issue.field)).toEqual([
      "keys[1].kid",
    ]);
  });
});
