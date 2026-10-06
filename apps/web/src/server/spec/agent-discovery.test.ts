import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acpDiscoveryDocument,
  agentGuidance,
  agentHomepageLinks,
  agentInstructions,
  apiCatalogDocument,
  authMd,
  mcpServerCard,
  oauthAuthorizationServer,
  oauthProtectedResource,
  openApiDocument,
  resourceMetadataWwwAuthenticate,
  ucpDiscoveryProfile,
} from "@/lib/agent-discovery";
import { organizationSchema } from "@/lib/seo";

const HOST = "https://ecentic.ai";

type Operation = {
  operationId?: string;
  description?: string;
  summary?: string;
  responses: Record<string, { content?: Record<string, { schema?: unknown }> }>;
};

const operations = () =>
  Object.entries(openApiDocument.paths).flatMap(([path, methods]) =>
    Object.entries(methods as Record<string, Operation>).map(
      ([method, operation]) => ({ path, method, operation }),
    ),
  );

describe("OpenAPI document", () => {
  test("is a parseable OpenAPI 3.1 document", () => {
    const parsed = JSON.parse(JSON.stringify(openApiDocument));
    expect(parsed.openapi).toBe("3.1.0");
    expect(parsed.info.title.length).toBeGreaterThan(0);
    expect(parsed.servers[0].url).toBe(HOST);
  });

  test("every operation has a unique operationId", () => {
    const ids = operations().map(({ operation }) => operation.operationId);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every operation has a description an LLM can route on", () => {
    for (const { path, method, operation } of operations()) {
      expect(operation.summary, `${method} ${path}`).toBeTruthy();
      expect(
        (operation.description ?? "").length,
        `${method} ${path}`,
      ).toBeGreaterThan(40);
    }
  });

  test("no success response is an untyped object", () => {
    // `{ type: "object", additionalProperties: true }` tells a function-calling
    // model nothing about what comes back — that permissiveness is what the
    // readiness audit scored as "0/4 typed schemas".
    const untyped = operations().flatMap(({ path, method, operation }) =>
      Object.entries(operation.responses)
        .filter(([status]) => status.startsWith("2"))
        .flatMap(([status, response]) =>
          Object.values(response.content ?? {})
            .filter((media) => {
              const schema = media.schema as
                | { $ref?: string; additionalProperties?: unknown }
                | undefined;
              return !schema?.$ref;
            })
            .map(() => `${method} ${path} ${status}`),
        ),
    );

    expect(untyped).toEqual([]);
  });

  test("every declared $ref resolves", () => {
    const document = JSON.parse(JSON.stringify(openApiDocument)) as Record<
      string,
      unknown
    >;
    const refs: string[] = [];

    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node !== "object" || node === null) return;
      for (const [key, value] of Object.entries(node)) {
        if (key === "$ref" && typeof value === "string") refs.push(value);
        else walk(value);
      }
    };
    walk(document);

    const resolve = (ref: string) =>
      ref
        .replace(/^#\//, "")
        .split("/")
        .reduce<unknown>(
          (node, key) => (node as Record<string, unknown> | undefined)?.[key],
          document,
        );

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter((ref) => resolve(ref) === undefined)).toEqual([]);
  });

  test("every operation states its security, including the public ones", () => {
    // An omitted `security` reads as "unspecified" to a function-calling
    // importer; an explicit `[]` reads as "no credential required", which is
    // the fact a caller needs.
    for (const { path, method, operation } of operations())
      expect(
        (operation as { security?: unknown }).security,
        `${method} ${path}`,
      ).toBeDefined();
  });

  test("every operation documents at least one failure", () => {
    for (const { path, method, operation } of operations())
      expect(
        Object.keys(operation.responses).some((status) =>
          status.startsWith("4"),
        ),
        `${method} ${path}`,
      ).toBe(true);
  });

  test("declares a typed RFC 9457 error model", () => {
    const problem = openApiDocument.components.schemas.Problem;
    expect(problem.required).toContain("code");
    expect(problem.properties.code.enum.length).toBeGreaterThan(5);
  });

  /**
   * The regression this guards: every error response used to be a
   * response-level `$ref` into `components.responses`. Readiness tooling and
   * function-calling extractors resolve a `$ref` inside a schema but not one at
   * the response level, so the document scored as "error schema defined but not
   * consistently referenced" — the schema existed and nothing appeared to use
   * it. Each error response now carries its own `content` block.
   */
  test("every documented failure carries a typed body", () => {
    const failures = operations().flatMap(({ path, method, operation }) =>
      Object.entries(operation.responses)
        .filter(([status]) => status.startsWith("4") || status.startsWith("5"))
        .map(([status, response]) => ({
          where: `${method} ${path} ${status}`,
          path,
          response: response as {
            content?: Record<string, { schema?: { $ref?: string } }>;
          },
        })),
    );

    expect(failures.length).toBeGreaterThanOrEqual(13);

    for (const { where, response } of failures) {
      const media = Object.values(response.content ?? {});
      expect(media.length, where).toBeGreaterThan(0);
      for (const entry of media) expect(entry.schema?.$ref, where).toBeString();
    }
  });

  /**
   * Two failures answer in another protocol's shape by design — the x402
   * challenge on `/api` and the JSON-RPC error envelope on the MCP POST. Every
   * other failure is the one shared RFC 9457 `Problem`, under both media types
   * so an extractor that only looks for `application/json` still sees it typed.
   */
  test("failures outside x402 and JSON-RPC are the shared Problem", () => {
    const PROTOCOL_SHAPED = new Set(["get /api 402", "post /api/mcp 401"]);

    for (const { path, method, operation } of operations())
      for (const [status, response] of Object.entries(operation.responses)) {
        if (!status.startsWith("4") && !status.startsWith("5")) continue;
        const where = `${method} ${path} ${status}`;
        if (PROTOCOL_SHAPED.has(where)) continue;

        const content =
          (
            response as {
              content?: Record<string, { schema?: { $ref?: string } }>;
            }
          ).content ?? {};
        expect(Object.keys(content), where).toContain(
          "application/problem+json",
        );
        expect(Object.keys(content), where).toContain("application/json");
        for (const entry of Object.values(content))
          expect(entry.schema?.$ref, where).toBe(
            "#/components/schemas/Problem",
          );
      }
  });

  /**
   * "13/13 operationIds, 3/13 typed schemas" — ten operations declared no
   * inputs at all, so nothing could be turned into a function signature. Every
   * operation now states at least one typed parameter or a typed request body.
   */
  test("every operation exposes a typed input schema", () => {
    // These three serve one fixed document and genuinely take no input.
    // Inventing a parameter to lift the count would be documentation that
    // lies, which costs an agent more than a missing schema does.
    const INPUTLESS = new Set([
      "get /.well-known/mcp.json",
      "get /.well-known/ucp",
      "get /.well-known/acp.json",
    ]);

    for (const { path, method, operation } of operations()) {
      if (INPUTLESS.has(`${method} ${path}`)) continue;
      const typed = operation as {
        parameters?: { schema?: unknown }[];
        requestBody?: { content?: Record<string, { schema?: unknown }> };
      };
      const parameters = typed.parameters ?? [];
      const bodies = Object.values(typed.requestBody?.content ?? {});
      expect(
        parameters.some((parameter) => parameter.schema !== undefined) ||
          bodies.some((body) => body.schema !== undefined),
        `${method} ${path}`,
      ).toBe(true);
    }
  });

  test("declares a versioning policy with a deprecation signal", () => {
    const versioning = openApiDocument["x-api-versioning"];
    expect(versioning.strategy).toBe("url-path");
    expect(versioning.current).toBe("v1");
    expect(versioning.sunsetHeader).toBe("Sunset");
    expect(versioning.minimumNoticeDays).toBeGreaterThanOrEqual(90);
    // Inlined at each operation rather than kept in `components.parameters`,
    // for the same reason the error responses are.
    expect(
      openApiDocument.paths["/api/v1"].get.parameters.some(
        (parameter) =>
          parameter.name === "API-Version" && parameter.in === "header",
      ),
    ).toBe(true);
  });

  test("versions the REST surface in the path", () => {
    expect(Object.keys(openApiDocument.paths)).toContain("/api/v1");
    expect(
      Object.keys(openApiDocument.paths).filter((path) =>
        path.startsWith("/api/v1"),
      ).length,
    ).toBeGreaterThanOrEqual(5);
  });

  test("documents the rate-limit headers it promises to send", () => {
    expect(openApiDocument["x-rate-limit"].headers).toContain("Retry-After");
    expect(
      openApiDocument.paths["/api/v1"].get.responses["200"].headers,
    ).toHaveProperty("RateLimit-Policy");
  });
});

describe("discovery documents", () => {
  test("the homepage Link header advertises the docs and the MCP manifest", () => {
    const header = agentHomepageLinks.join(", ");
    expect(header).toContain("</docs>");
    expect(header).toContain("</.well-known/mcp.json>");
    expect(header).toContain("</.well-known/agent-instructions.md>");
    expect(header).toContain("</ai-instructions>");
    expect(header).toContain("</api/v1>");
  });

  test("the API catalog anchors the versioned REST surface", () => {
    const anchors = apiCatalogDocument.linkset.map((entry) => entry.anchor);
    expect(anchors).toContain(`${HOST}/api/v1`);
  });

  test("the MCP server card names a transport and both endpoints", () => {
    expect(mcpServerCard.transport.type).toBe("streamable-http");
    expect(mcpServerCard.transport.endpoint).toBe(`${HOST}/api/mcp`);
    expect(mcpServerCard.transport.alternativeEndpoints).toContain(
      `${HOST}/mcp`,
    );
    expect(mcpServerCard.protocolVersion).toBe("2025-03-26");
  });

  test("OAuth metadata still points at the protected MCP resource", () => {
    expect(oauthProtectedResource.resource).toBe(`${HOST}/api/mcp`);
    expect(oauthAuthorizationServer.issuer).toBe(HOST);
    expect(authMd).toContain("/.well-known/oauth-protected-resource");
  });

  test("the 401 challenge names the protected resource metadata (RFC 9728)", () => {
    expect(resourceMetadataWwwAuthenticate).toStartWith(
      'Bearer resource_metadata="',
    );
    expect(resourceMetadataWwwAuthenticate).toContain(
      "/.well-known/oauth-protected-resource",
    );
  });

  test("commerce profiles keep their protocol versions", () => {
    expect(ucpDiscoveryProfile.ucp.version).toBe("2026-04-08");
    expect(acpDiscoveryDocument.protocol.version).toBe("2026-01-30");
  });
});

describe("agent guidance", () => {
  test("names concrete jobs, not a product description", () => {
    expect(agentGuidance.bestFor.length).toBeGreaterThanOrEqual(4);
    for (const entry of agentGuidance.bestFor) {
      expect(entry.job.length).toBeGreaterThan(15);
      expect(entry.detail.length).toBeGreaterThan(40);
      expect(entry.start).toStartWith(`${HOST}/`);
    }
  });

  test("says where ecentic stops", () => {
    // An agent that knows the boundary wastes fewer calls finding it.
    expect(agentGuidance.notFor.length).toBeGreaterThanOrEqual(3);
  });

  test("the instructions document carries when-to-use and how-to-call", () => {
    expect(agentInstructions).toContain("## When to use ecentic");
    expect(agentInstructions).toContain("## When not to use ecentic");
    expect(agentInstructions).toContain("## How to call ecentic");
    for (const entry of agentGuidance.bestFor)
      expect(agentInstructions).toContain(entry.job);
  });
});

describe("organization schema", () => {
  test("carries both a contactPoint and an address", () => {
    expect(organizationSchema.address["@type"]).toBe("PostalAddress");
    expect(organizationSchema.address.addressCountry.length).toBe(2);
    expect(organizationSchema.contactPoint.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Verification tooling scores a PostalAddress by how much of it resolves to a
   * real place. Locality plus country alone reads as a jurisdiction claim, so
   * the street line has to be there for the node to count as an address.
   */
  test("the postal address names a street, a locality, and a country", () => {
    expect(organizationSchema.address.streetAddress.length).toBeGreaterThan(0);
    expect(organizationSchema.address.addressLocality.length).toBeGreaterThan(
      0,
    );
    expect(organizationSchema.address.addressCountry).toMatch(/^[A-Z]{2}$/);
  });

  /**
   * Structured data is only worth as much as the page behind it: a verifier
   * that finds an address in JSON-LD and nowhere in the rendered site scores it
   * as an unbacked claim. The terms publish the same address, so the two must
   * not be edited apart.
   */
  test("the schema address is also published in the terms", () => {
    const catalog = readFileSync(
      join(import.meta.dir, "../../../messages/en.json"),
      "utf8",
    );
    expect(catalog).toContain(organizationSchema.address.streetAddress);
    expect(catalog).toContain(organizationSchema.address.addressLocality);
  });

  test("every contact point declares a type and a reachable channel", () => {
    for (const contact of organizationSchema.contactPoint) {
      expect(contact["@type"]).toBe("ContactPoint");
      expect(contact.contactType.length).toBeGreaterThan(0);
      expect(contact.email).toMatch(/^[^@]+@ecentic\.ai$/);
      expect(contact.url).toStartWith(HOST);
    }
  });
});
