import { describe, expect, test } from "bun:test";
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
    expect(
      openApiDocument.components.responses.RateLimited.content[
        "application/problem+json"
      ].schema.$ref,
    ).toBe("#/components/schemas/Problem");
  });

  test("declares a versioning policy with a deprecation signal", () => {
    const versioning = openApiDocument["x-api-versioning"];
    expect(versioning.strategy).toBe("url-path");
    expect(versioning.current).toBe("v1");
    expect(versioning.sunsetHeader).toBe("Sunset");
    expect(versioning.minimumNoticeDays).toBeGreaterThanOrEqual(90);
    expect(openApiDocument.components.parameters.ApiVersion.in).toBe("header");
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

  test("every contact point declares a type and a reachable channel", () => {
    for (const contact of organizationSchema.contactPoint) {
      expect(contact["@type"]).toBe("ContactPoint");
      expect(contact.contactType.length).toBeGreaterThan(0);
      expect(contact.email).toMatch(/^[^@]+@ecentic\.ai$/);
      expect(contact.url).toStartWith(HOST);
    }
  });
});
