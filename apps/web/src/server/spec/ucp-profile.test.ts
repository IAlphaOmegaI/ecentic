import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { ucpDiscoveryProfile } from "@/lib/agent-discovery";
import * as Validator from "@/server/app/intelligence/ucp/validator";
import { UCP_VERSION } from "@/server/app/ucp/protocol";
import { signRequest } from "@/server/app/ucp/signatures";
import type { StorefrontInfo } from "@/server/app/ucp/store-context";

/**
 * ecentic publishes two UCP business profiles: its own, a constant, and one
 * per hosted store, built on request. Both declare 2026-04-08, and both used
 * to break that revision's profile structure in ways a platform acts on:
 *
 *  - signing keys nested inside `ucp`, where a verifier does not look, so the
 *    signature on an order webhook could not be checked;
 *  - no `payment_handlers` registry on a store with no handler declared,
 *    though the registry is required even when empty;
 *  - `supported_versions` mapping the profile's own version to itself, when it
 *    lists older versions and their separate profiles;
 *  - capabilities with no `spec` or `schema` link.
 *
 * Spec: https://ucp.dev/2026-04-08/specification/overview/ — "Profile
 * Structure", "Spec URL Binding" and "Protocol Version".
 */

// `buildDiscoveryProfile` is pure, but it takes the endpoint URL from
// store-context, whose module also loads the store repositories — and their
// import graph reaches the AI SDK's client bundle, which does not load under
// the test runner. Stub both, as woocommerce.test.ts does.
mock.module("../app/store", () => ({}));
mock.module("../app/store-account", () => ({}));
const { buildDiscoveryProfile } = await import("../app/ucp/discovery");

type Entry = { version: string; spec?: string; schema?: string };

type Profile = {
  ucp: {
    version: string;
    services: Record<string, unknown>;
    capabilities: Record<string, readonly Entry[]>;
    payment_handlers?: Record<string, unknown>;
    supported_versions?: Record<string, string>;
    signing_keys?: unknown;
  };
  signing_keys?: { kid: string }[];
};

/**
 * The hosted profile reads two variables: the signing key it publishes and the
 * host its endpoint is built on. A developer's shell may set either, so both
 * are pinned for every test — written the way trial.test.ts writes them,
 * through a variable key and with `delete` rather than an assigned
 * `undefined`, which Node coerces to the string "undefined".
 */
const VARIABLES = ["UCP_SIGNING_PRIVATE_KEY", "APP_HOST"] as const;
const environment = process.env as Record<string, string | undefined>;
const original = { ...process.env };

const setVariable = (name: string, value: string | undefined) => {
  if (value === undefined) delete environment[name];
  else environment[name] = value;
};

beforeEach(() => {
  setVariable("UCP_SIGNING_PRIVATE_KEY", undefined);
  setVariable("APP_HOST", "https://ecentic.ai");
});

afterEach(() => {
  for (const name of VARIABLES) setVariable(name, original[name]);
});

/** A throwaway ES256 key in the PKCS#8 PEM form the variable holds. */
const PRIVATE_KEY = generateKeyPairSync("ec", { namedCurve: "P-256" })
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();

/**
 * A business declaration as the spec requires it (`id`, `version`). The store
 * plugin writes the real ones and the profile passes them through untouched.
 */
const GOOGLE_PAY = {
  id: "gpay-0f8c1e5b",
  version: UCP_VERSION,
  config: { merchant_id: "BCR2DN4T7654321" },
};

const storefront = (
  overrides: Partial<StorefrontInfo> = {},
): StorefrontInfo => ({
  links: [],
  urls: {
    home: "https://shop.example/",
    cart: "https://shop.example/cart/",
    checkout: "https://shop.example/checkout/",
    shop: "https://shop.example/shop/",
  },
  requireSignatures: false,
  paymentHandlers: {},
  apiKey: "",
  allowedAgentProfiles: [],
  rateLimitPerMinute: 120,
  includeOutOfStock: false,
  identityScopes: {},
  ...overrides,
});

const hosted = (info?: StorefrontInfo | null) =>
  buildDiscoveryProfile({ id: "store_1" }, info) as Profile;

/** `dev.ucp.shopping.cart` → `https://ucp.dev`: the first two labels, reversed. */
const authority = (name: string) =>
  `https://${name.split(".").slice(0, 2).reverse().join(".")}`;

/**
 * Everything that makes a profile non-conforming. The validator supplies its
 * errors and its warning for keys nested inside `ucp`. Two rules are checked
 * here because, on 2026-04-08, the validator follows the business schema where
 * the schema and the prose disagree: the prose requires a `spec` and a
 * `schema` on every capability, on the origin of its namespace authority, and
 * it defines `supported_versions` as older versions only.
 *
 * A profile the validator did not judge reports that too — no errors from an
 * unjudged profile is not a pass.
 */
const faults = (profile: Profile) => {
  const validation = Validator.validateUcpSpec(profile);
  const { version, capabilities, supported_versions: supported } = profile.ucp;

  return [
    ...(validation.validatedAgainst === version
      ? []
      : [{ field: "version", message: `Not validated against ${version}.` }]),
    ...validation.issues
      .filter(
        (issue) =>
          issue.severity === "error" || issue.field === "ucp.signing_keys",
      )
      .map(({ field, message }) => ({ field, message })),
    ...Object.entries(capabilities).flatMap(([name, entries]) =>
      entries.flatMap((entry, index) =>
        (["spec", "schema"] as const)
          .filter((link) => !entry[link]?.startsWith(`${authority(name)}/`))
          .map((link) => ({
            field: `capabilities.${name}[${index}].${link}`,
            message: `Must be a URL on ${authority(name)}.`,
          })),
      ),
    ),
    ...Object.keys(supported ?? {})
      .filter((listed) => listed >= version)
      .map((listed) => ({
        field: `supported_versions.${listed}`,
        message: `Lists only versions older than ${version}.`,
      })),
  ];
};

describe("the checks themselves", () => {
  /**
   * The hosted profile as it was served before the four defects were fixed.
   * If this ever comes back clean, the cases below prove nothing.
   */
  test("find all four defects in the profile as it used to be served", () => {
    const before: Profile = {
      ucp: {
        version: UCP_VERSION,
        services: {
          "dev.ucp.shopping": [
            {
              version: UCP_VERSION,
              transport: "rest",
              endpoint: "https://ecentic.ai/api/ucp/stores/store_1",
            },
          ],
        },
        capabilities: {
          "dev.ucp.shopping.checkout": [{ version: UCP_VERSION }],
        },
        supported_versions: {
          [UCP_VERSION]: "https://shop.example/.well-known/ucp",
        },
        signing_keys: [
          {
            kid: "ucp-0123456789ab",
            kty: "EC",
            crv: "P-256",
            x: "qIVYZVLCrPZHGHjP17CTW0_-D9Lfw0EkjqF7xB4FivA",
            y: "Mc4nN9LTDOBhfoUeg8Ye9WedFRhnZXZJA12Qp0zZ6F0",
            use: "sig",
            alg: "ES256",
          },
        ],
      },
    };

    // Contained, not equal: the validator may come to report more of this
    // profile than these four, and that is not this test's business.
    expect(faults(before).map((fault) => fault.field)).toEqual(
      expect.arrayContaining([
        "payment_handlers",
        "ucp.signing_keys",
        "capabilities.dev.ucp.shopping.checkout[0].spec",
        "capabilities.dev.ucp.shopping.checkout[0].schema",
        `supported_versions.${UCP_VERSION}`,
      ]),
    );
  });
});

describe("the profile ecentic serves for itself", () => {
  test("conforms to the revision it declares", () => {
    expect(ucpDiscoveryProfile.ucp.version).toBe(UCP_VERSION);
    expect(faults(ucpDiscoveryProfile)).toEqual([]);
  });

  test("carries the payment handler registry, though it is empty", () => {
    expect(ucpDiscoveryProfile.ucp.payment_handlers).toEqual({});
  });

  test("lists no supported versions, since it speaks only one", () => {
    expect(ucpDiscoveryProfile.ucp).not.toHaveProperty("supported_versions");
  });
});

describe("a hosted store's profile", () => {
  test("conforms when the store facts could not be loaded", () => {
    expect(faults(hosted(null))).toEqual([]);
  });

  test("conforms with nothing declared and no signing key", () => {
    const profile = hosted(storefront());

    expect(faults(profile)).toEqual([]);
    expect(profile.ucp.payment_handlers).toEqual({});
    expect(profile.ucp).not.toHaveProperty("supported_versions");
    expect(profile).not.toHaveProperty("signing_keys");
  });

  test("publishes the payment handlers the store declared", () => {
    const profile = hosted(
      storefront({ paymentHandlers: { "com.google.pay": [GOOGLE_PAY] } }),
    );

    expect(faults(profile)).toEqual([]);
    expect(profile.ucp.payment_handlers).toEqual({
      "com.google.pay": [GOOGLE_PAY],
    });
  });

  test("conforms when the store links identities", () => {
    const profile = hosted(
      storefront({ identityScopes: { "dev.ucp.shopping.order:read": {} } }),
    );

    expect(faults(profile)).toEqual([]);
    expect(Object.keys(profile.ucp.capabilities)).toContain(
      "dev.ucp.common.identity_linking",
    );
  });

  /**
   * The point of the top-level array: a platform that receives a signed order
   * webhook looks the `keyid` up there. The key the webhook is signed with has
   * to be the one it finds.
   */
  test("publishes its signing key beside ucp, where a verifier looks", () => {
    setVariable("UCP_SIGNING_PRIVATE_KEY", PRIVATE_KEY);

    const profile = hosted(
      storefront({ paymentHandlers: { "com.google.pay": [GOOGLE_PAY] } }),
    );
    const signature = signRequest(
      "POST",
      "https://platform.example/webhooks/ucp",
      "{}",
    );

    expect(faults(profile)).toEqual([]);
    expect(profile.ucp).not.toHaveProperty("signing_keys");
    expect(profile.signing_keys).toHaveLength(1);
    expect(Validator.validateUcpSpec(profile).signingKeys).toHaveLength(1);
    expect(signature["Signature-Input"]).toContain(
      `keyid="${profile.signing_keys?.[0]?.kid}"`,
    );
  });
});

describe("the links a capability declares", () => {
  /**
   * A test cannot fetch ucp.dev, so each link is held to the layout the site
   * publishes: a schema at `schemas/{vertical}/{name}.json` and a page at
   * `specification/{name}`, where a dot in the name is `_` in the file and `/`
   * in the page, and `_` in the name is `-` in the page (`buyer_consent` is at
   * `buyer-consent`; `buyer_consent` is a 404). Every URL this produces was
   * fetched on 2026-10-07, and each schema file named the capability linking
   * it.
   */
  test("are the ones ucp.dev publishes for it", () => {
    const profiles: Profile[] = [
      ucpDiscoveryProfile,
      hosted(
        storefront({ identityScopes: { "dev.ucp.shopping.order:read": {} } }),
      ),
    ];

    for (const profile of profiles)
      for (const [name, entries] of Object.entries(profile.ucp.capabilities)) {
        const [, , vertical, ...labels] = name.split(".");

        for (const entry of entries) {
          const base = `https://ucp.dev/${entry.version}`;

          expect(entry.schema, name).toBe(
            `${base}/schemas/${vertical}/${labels.join("_")}.json`,
          );
          expect(entry.spec, name).toBe(
            `${base}/specification/${labels.join("/").replaceAll("_", "-")}`,
          );
        }
      }
  });
});
