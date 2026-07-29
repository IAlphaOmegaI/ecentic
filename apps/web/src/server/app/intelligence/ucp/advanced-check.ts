"use server";

import { resultify } from "@zenncore/utils";

const AGENT_HEADERS = {
  Accept: "application/json, */*",
  "Content-Type": "application/json",
  "UCP-Agent": 'profile="https://ecentic.ai/ucp-validator"',
  "User-Agent": "UCP-Validator/1.0 (ecentic; https://ecentic.ai)",
} as const;

export type EndpointProbeResult = {
  serviceName: string;
  serviceLabel: string;
  endpoint: string;
  transport: string | null;
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  corsAllowed: boolean;
  error: string | null;
};

export type CheckoutStep =
  | "cors"
  | "cart_create"
  | "cart_update"
  | "checkout_create"
  | "checkout_complete"
  | "checkout_cancel";

export type CheckoutStepResult = {
  step: CheckoutStep;
  label: string;
  httpStatus: number | null;
  latencyMs: number | null;
  passed: boolean;
  skipped: boolean;
  note: string;
};

export type AdvancedGrade = "A" | "B" | "C" | "F";

export type McpToolInfo = {
  name: string;
  description: string | null;
};

export type McpToolTestResult = {
  toolName: string;
  label: string;
  present: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  passed: boolean;
  note: string;
};

export type McpProbeResult = {
  serviceName: string;
  serviceLabel: string;
  endpoint: string;
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  protocolVersion: string | null;
  serverName: string | null;
  tools: McpToolInfo[];
  toolTests: McpToolTestResult[];
  hasSearch: boolean;
  hasCheckout: boolean;
  transport: "http-json" | "sse" | "unknown";
  error: string | null;
};

export type A2aProbeResult = {
  serviceName: string;
  serviceLabel: string;
  endpoint: string;
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  agentCardFound: boolean;
  agentName: string | null;
  ucpExtensionPresent: boolean;
  error: string | null;
};

export type AdvancedCheckResult = {
  domain: string;
  endpointProbes: EndpointProbeResult[];
  mcpProbes: McpProbeResult[];
  a2aProbes: A2aProbeResult[];
  checkoutLifecycle: CheckoutStepResult[];
  grade: AdvancedGrade;
  gradeDetail: string;
};

const KNOWN_SERVICE_LABELS: Record<string, string> = {
  "dev.ucp.shopping": "Shopping",
  "dev.ucp.identity": "Identity",
  "dev.ucp.common": "Common",
};

// Tool names follow UCP spec §3A (MCP operation-to-tool mappings)
const WELL_KNOWN_MCP_TOOLS: Array<{
  name: string;
  label: string;
  testArgs: Record<string, unknown>;
}> = [
  {
    name: "search_catalog",
    label: "Search catalog",
    testArgs: { query: "coffee" },
  },
  { name: "lookup_catalog", label: "Lookup catalog", testArgs: { ids: [] } },
  {
    name: "get_product",
    label: "Get product",
    testArgs: { id: "__ecentic_probe__" },
  },
  { name: "create_cart", label: "Create cart", testArgs: { items: [] } },
  {
    name: "get_cart",
    label: "Get cart",
    testArgs: { id: "__ecentic_probe__" },
  },
  {
    name: "update_cart",
    label: "Update cart",
    testArgs: { id: "__ecentic_probe__", items: [] },
  },
  {
    name: "cancel_cart",
    label: "Cancel cart",
    testArgs: { id: "__ecentic_probe__" },
  },
  { name: "create_checkout", label: "Create checkout", testArgs: {} },
  {
    name: "get_checkout",
    label: "Get checkout",
    testArgs: { id: "__ecentic_probe__" },
  },
  {
    name: "update_checkout",
    label: "Update checkout",
    testArgs: { id: "__ecentic_probe__" },
  },
  {
    name: "complete_checkout",
    label: "Complete checkout",
    testArgs: { id: "__ecentic_probe__" },
  },
  {
    name: "cancel_checkout",
    label: "Cancel checkout",
    testArgs: { id: "__ecentic_probe__" },
  },
  {
    name: "get_order",
    label: "Get order",
    testArgs: { id: "__ecentic_probe__" },
  },
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const callMcpTool = async (
  endpoint: string,
  toolName: string,
  toolLabel: string,
  testArgs: Record<string, unknown>,
): Promise<McpToolTestResult> => {
  const start = performance.now();

  const result = await resultify(() =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": AGENT_HEADERS["User-Agent"],
      },
      // UCP spec §3B: meta is required in every tool invocation for capability negotiation
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: {
            meta: {
              "ucp-agent": { profile: "https://ecentic.ai/ucp/agent-profile" },
            },
            ...testArgs,
          },
        },
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );

  const latencyMs = Math.round(performance.now() - start);

  if (!result.success) {
    return {
      toolName,
      label: toolLabel,
      present: true,
      httpStatus: null,
      latencyMs: null,
      passed: false,
      note: "Request timed out.",
    };
  }

  const response = result.data;
  const textResult = await resultify(() => response.text());

  if (!textResult.success) {
    return {
      toolName,
      label: toolLabel,
      present: true,
      httpStatus: response.status,
      latencyMs,
      passed: false,
      note: "Could not read response body.",
    };
  }

  type McpCallBody = {
    result?: { content?: unknown; isError?: boolean };
    error?: { code?: number; message?: string };
  };

  let body: McpCallBody;
  try {
    body = JSON.parse(textResult.data) as McpCallBody;
  } catch {
    return {
      toolName,
      label: toolLabel,
      present: true,
      httpStatus: response.status,
      latencyMs,
      passed: response.status < 500,
      note: "Response is not valid JSON.",
    };
  }

  if (body.error) {
    const code = body.error.code ?? 0;
    const msg = (body.error.message ?? "").toLowerCase();
    const isNotFound =
      code === -32601 ||
      msg.includes("not found") ||
      msg.includes("unknown tool") ||
      msg.includes("no tool") ||
      msg.includes("method not found");
    return {
      toolName,
      label: toolLabel,
      present: !isNotFound,
      httpStatus: response.status,
      latencyMs,
      passed: !isNotFound && response.status < 500,
      note: isNotFound
        ? "Tool not found on this MCP server."
        : `JSON-RPC error: ${body.error.message ?? "unknown"}`,
    };
  }

  return {
    toolName,
    label: toolLabel,
    present: true,
    httpStatus: response.status,
    latencyMs,
    passed: response.status < 500,
    note:
      body.result?.isError === true
        ? "Tool returned an application error — expected for probe input."
        : "Tool responded successfully.",
  };
};

const probeMcpEndpoint = async (
  serviceName: string,
  serviceLabel: string,
  endpoint: string,
): Promise<McpProbeResult> => {
  const initStart = performance.now();

  const initResult = await resultify(() =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "User-Agent": AGENT_HEADERS["User-Agent"],
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "ecentic-validator", version: "1.0" },
        },
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );

  const initLatency = Math.round(performance.now() - initStart);

  if (!initResult.success) {
    return {
      serviceName,
      serviceLabel,
      endpoint,
      reachable: false,
      httpStatus: null,
      latencyMs: null,
      protocolVersion: null,
      serverName: null,
      tools: [],
      toolTests: [],
      hasSearch: false,
      hasCheckout: false,
      transport: "unknown",
      error: "MCP endpoint did not respond within 8 s.",
    };
  }

  const initResponse = initResult.data;
  const contentType = initResponse.headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {
    return {
      serviceName,
      serviceLabel,
      endpoint,
      reachable: initResponse.status < 500,
      httpStatus: initResponse.status,
      latencyMs: initLatency,
      protocolVersion: null,
      serverName: null,
      tools: [],
      toolTests: [],
      hasSearch: false,
      hasCheckout: false,
      transport: "sse",
      error: null,
    };
  }

  const initTextResult = await resultify(() => initResponse.text());
  let protocolVersion: string | null = null;
  let serverName: string | null = null;

  type McpInitBody = {
    result?: { protocolVersion?: string; serverInfo?: { name?: string } };
  };
  type McpToolsBody = {
    result?: { tools?: Array<{ name?: string; description?: string }> };
  };

  if (initTextResult.success && initResponse.ok) {
    const body = resultify(
      () => JSON.parse(initTextResult.data) as McpInitBody,
    );
    if (body.success) {
      if (typeof body.data.result?.protocolVersion === "string")
        protocolVersion = body.data.result.protocolVersion;
      const srvName = body.data.result?.serverInfo?.name;
      if (typeof srvName === "string") serverName = srvName;
    }
  }

  // List tools
  const toolsResult = await resultify(() =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": AGENT_HEADERS["User-Agent"],
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );

  let tools: McpToolInfo[] = [];

  if (toolsResult.success && toolsResult.data.ok) {
    const toolsText = await resultify(() => toolsResult.data.text());
    if (toolsText.success) {
      const body = resultify(() => JSON.parse(toolsText.data) as McpToolsBody);
      if (body.success)
        tools = (body.data.result?.tools ?? []).map((t) => ({
          name: typeof t.name === "string" ? t.name : "unknown",
          description: typeof t.description === "string" ? t.description : null,
        }));
    }
  }

  // Always call all well-known tools — presence is determined from the JSON-RPC response,
  // not from tools/list, since initialize may return non-2xx even on working servers.
  const toolTests = await Promise.all(
    WELL_KNOWN_MCP_TOOLS.map(({ name, label, testArgs }) =>
      callMcpTool(endpoint, name, label, testArgs),
    ),
  );

  // Combine declared tools from tools/list with confirmed-present tools from call results
  const confirmedToolNames = new Set([
    ...tools.map((t) => t.name.toLowerCase()),
    ...toolTests.filter((t) => t.present).map((t) => t.toolName.toLowerCase()),
  ]);
  const hasSearch = [...confirmedToolNames].some((n) =>
    ["search", "find", "catalog", "browse", "lookup"].some((k) =>
      n.includes(k),
    ),
  );
  const hasCheckout = [...confirmedToolNames].some((n) =>
    ["checkout", "cart", "order", "buy", "purchase"].some((k) => n.includes(k)),
  );

  return {
    serviceName,
    serviceLabel,
    endpoint,
    reachable: initResponse.status < 500,
    httpStatus: initResponse.status,
    latencyMs: initLatency,
    protocolVersion,
    serverName,
    tools,
    toolTests,
    hasSearch,
    hasCheckout,
    transport: "http-json",
    error:
      initResponse.status >= 500
        ? `Server error HTTP ${initResponse.status}.`
        : null,
  };
};

const probeEndpoint = async (
  serviceName: string,
  serviceLabel: string,
  endpoint: string,
  transport: string | null,
): Promise<EndpointProbeResult> => {
  const start = performance.now();

  const result = await resultify(() =>
    fetch(endpoint, {
      method: "HEAD",
      headers: {
        "UCP-Agent": AGENT_HEADERS["UCP-Agent"],
        "User-Agent": AGENT_HEADERS["User-Agent"],
        Origin: "https://ecentic.ai",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    }),
  );

  const latencyMs = Math.round(performance.now() - start);

  if (!result.success) {
    return {
      serviceName,
      serviceLabel,
      endpoint,
      transport,
      reachable: false,
      httpStatus: null,
      latencyMs: null,
      corsAllowed: false,
      error: "Endpoint did not respond within 5 s.",
    };
  }

  const response = result.data;
  const corsOrigin = response.headers.get("access-control-allow-origin");

  return {
    serviceName,
    serviceLabel,
    endpoint,
    transport,
    reachable: response.status < 500,
    httpStatus: response.status,
    latencyMs,
    corsAllowed: corsOrigin !== null,
    error:
      response.status >= 500
        ? `Server returned HTTP ${response.status}.`
        : null,
  };
};

const runCheckoutLifecycle = async (
  baseEndpoint: string,
): Promise<CheckoutStepResult[]> => {
  const base = baseEndpoint.replace(/\/$/, "");
  const cartsUrl = `${base}/carts`;
  const checkoutSessionsUrl = `${base}/checkout-sessions`;
  const steps: CheckoutStepResult[] = [];

  // Step 1: CORS preflight on /carts — browser-based AI agent clients must be allowed
  const corsStart = performance.now();
  const corsResult = await resultify(() =>
    fetch(cartsUrl, {
      method: "OPTIONS",
      headers: {
        Origin: "https://ecentic.ai",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,ucp-agent",
      },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    }),
  );
  const corsLatency = Math.round(performance.now() - corsStart);

  if (!corsResult.success) {
    steps.push({
      step: "cors",
      label: "CORS preflight",
      httpStatus: null,
      latencyMs: null,
      passed: false,
      skipped: false,
      note: "OPTIONS request timed out — endpoint may block CORS preflight from AI agent clients.",
    });
  } else {
    const allowOrigin = corsResult.data.headers.get(
      "access-control-allow-origin",
    );
    const allowMethods = corsResult.data.headers.get(
      "access-control-allow-methods",
    );
    steps.push({
      step: "cors",
      label: "CORS preflight",
      httpStatus: corsResult.data.status,
      latencyMs: corsLatency,
      passed: allowOrigin !== null,
      skipped: false,
      note:
        allowOrigin !== null
          ? `Access-Control-Allow-Origin: ${allowOrigin}${allowMethods ? ` · Methods: ${allowMethods}` : ""}`
          : "No CORS headers — browser-hosted AI agent clients will be blocked by same-origin policy.",
    });
  }

  // Step 2: Create cart — POST /carts
  const cartCreateStart = performance.now();
  const cartCreateResult = await resultify(() =>
    fetch(cartsUrl, {
      method: "POST",
      headers: AGENT_HEADERS,
      body: JSON.stringify({
        items: [{ product_id: "__ecentic_probe__", quantity: 1 }],
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );
  const cartCreateLatency = Math.round(performance.now() - cartCreateStart);

  if (!cartCreateResult.success) {
    steps.push({
      step: "cart_create",
      label: "Create cart",
      httpStatus: null,
      latencyMs: null,
      passed: false,
      skipped: false,
      note: "POST /carts timed out or could not connect.",
    });
    for (const s of [
      { step: "cart_update" as const, label: "Update cart" },
      { step: "checkout_create" as const, label: "Create checkout session" },
      { step: "checkout_complete" as const, label: "Complete checkout" },
      { step: "checkout_cancel" as const, label: "Cancel checkout" },
    ]) {
      steps.push({
        ...s,
        httpStatus: null,
        latencyMs: null,
        passed: false,
        skipped: true,
        note: "Skipped — cart create failed.",
      });
    }
    return steps;
  }

  const cartCreateStatus = cartCreateResult.data.status;
  const cartCreateText = await resultify(() => cartCreateResult.data.text());
  let cartId: string | null = null;

  if (
    cartCreateText.success &&
    cartCreateStatus >= 200 &&
    cartCreateStatus < 300
  ) {
    type CartBody = { id?: string; cart_id?: string };
    const body = resultify(() => JSON.parse(cartCreateText.data) as CartBody);
    if (body.success) {
      const rawId = body.data.id ?? body.data.cart_id;
      if (typeof rawId === "string") cartId = rawId;
    }
  }

  steps.push({
    step: "cart_create",
    label: "Create cart",
    httpStatus: cartCreateStatus,
    latencyMs: cartCreateLatency,
    passed: cartCreateStatus < 500,
    skipped: false,
    note: (() => {
      if (cartCreateStatus >= 500)
        return `Server error HTTP ${cartCreateStatus} — bug in cart handler.`;
      if (cartCreateStatus >= 200 && cartCreateStatus < 300)
        return `Cart created${cartId ? " · cart ID received" : " · no cart ID in response"}.`;
      if (cartCreateStatus === 400 || cartCreateStatus === 422)
        return `HTTP ${cartCreateStatus} — validation error expected for probe item ID.`;
      if (cartCreateStatus === 404)
        return "HTTP 404 — confirm /carts path is correct for this endpoint.";
      return `HTTP ${cartCreateStatus}`;
    })(),
  });

  // Step 3: Update cart — PUT /carts/{cartId}
  if (!cartId) {
    steps.push({
      step: "cart_update",
      label: "Update cart",
      httpStatus: null,
      latencyMs: null,
      passed: true,
      skipped: true,
      note:
        cartCreateStatus < 300
          ? "Skipped — no cart ID in create response."
          : "Skipped — cart create returned validation error (expected for probe item).",
    });
  } else {
    const cartUpdateStart = performance.now();
    const cartUpdateResult = await resultify(() =>
      fetch(`${cartsUrl}/${cartId}`, {
        method: "PUT",
        headers: AGENT_HEADERS,
        body: JSON.stringify({
          items: [{ product_id: "__ecentic_probe__", quantity: 2 }],
        }),
        redirect: "follow",
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      }),
    );
    const cartUpdateLatency = Math.round(performance.now() - cartUpdateStart);

    if (!cartUpdateResult.success) {
      steps.push({
        step: "cart_update",
        label: "Update cart",
        httpStatus: null,
        latencyMs: null,
        passed: false,
        skipped: false,
        note: "PUT /carts/{id} timed out.",
      });
    } else {
      const status = cartUpdateResult.data.status;
      steps.push({
        step: "cart_update",
        label: "Update cart",
        httpStatus: status,
        latencyMs: cartUpdateLatency,
        passed: status < 500,
        skipped: false,
        note: status >= 500 ? `Server error HTTP ${status}.` : `HTTP ${status}`,
      });
    }
  }

  // Step 4: Create checkout session — POST /checkout-sessions (per UCP spec §2A)
  const checkoutCreateStart = performance.now();
  const checkoutCreateResult = await resultify(() =>
    fetch(checkoutSessionsUrl, {
      method: "POST",
      headers: AGENT_HEADERS,
      body: JSON.stringify({ cart_id: cartId ?? "__ecentic_probe__" }),
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );
  const checkoutCreateLatency = Math.round(
    performance.now() - checkoutCreateStart,
  );

  let sessionId: string | null = null;

  if (!checkoutCreateResult.success) {
    steps.push({
      step: "checkout_create",
      label: "Create checkout session",
      httpStatus: null,
      latencyMs: null,
      passed: false,
      skipped: false,
      note: "POST /checkout-sessions timed out.",
    });
    for (const s of [
      { step: "checkout_complete" as const, label: "Complete checkout" },
      { step: "checkout_cancel" as const, label: "Cancel checkout" },
    ]) {
      steps.push({
        ...s,
        httpStatus: null,
        latencyMs: null,
        passed: false,
        skipped: true,
        note: "Skipped — checkout session create failed.",
      });
    }
    return steps;
  }

  const checkoutCreateStatus = checkoutCreateResult.data.status;
  const checkoutCreateText = await resultify(() =>
    checkoutCreateResult.data.text(),
  );

  if (
    checkoutCreateText.success &&
    checkoutCreateStatus >= 200 &&
    checkoutCreateStatus < 300
  ) {
    type CheckoutSessionBody = {
      id?: string;
      session_id?: string;
      checkout_id?: string;
    };
    const body = resultify(
      () => JSON.parse(checkoutCreateText.data) as CheckoutSessionBody,
    );
    if (body.success) {
      const rawId =
        body.data.id ?? body.data.session_id ?? body.data.checkout_id;
      if (typeof rawId === "string") sessionId = rawId;
    }
  }

  steps.push({
    step: "checkout_create",
    label: "Create checkout session",
    httpStatus: checkoutCreateStatus,
    latencyMs: checkoutCreateLatency,
    passed: checkoutCreateStatus < 500,
    skipped: false,
    note: (() => {
      if (checkoutCreateStatus >= 500)
        return `Server error HTTP ${checkoutCreateStatus} — bug in checkout handler.`;
      if (checkoutCreateStatus >= 200 && checkoutCreateStatus < 300)
        return `Session created${sessionId ? " · session ID received" : " · no session ID in response"}.`;
      if (checkoutCreateStatus === 400 || checkoutCreateStatus === 422)
        return `HTTP ${checkoutCreateStatus} — validation error expected for probe cart.`;
      if (checkoutCreateStatus === 404)
        return "HTTP 404 — confirm /checkout-sessions path is correct for this endpoint.";
      return `HTTP ${checkoutCreateStatus}`;
    })(),
  });

  // Step 5: Complete checkout — POST /checkout-sessions/{id}/complete
  const completeSkipNote = sessionId
    ? null
    : checkoutCreateStatus < 300
      ? "Skipped — no session ID in create response."
      : "Skipped — checkout session create returned validation error.";

  if (completeSkipNote) {
    steps.push({
      step: "checkout_complete",
      label: "Complete checkout",
      httpStatus: null,
      latencyMs: null,
      passed: true,
      skipped: true,
      note: completeSkipNote,
    });
    steps.push({
      step: "checkout_cancel",
      label: "Cancel checkout",
      httpStatus: null,
      latencyMs: null,
      passed: true,
      skipped: true,
      note: completeSkipNote,
    });
    return steps;
  }

  const completeStart = performance.now();
  const completeResult = await resultify(() =>
    fetch(`${checkoutSessionsUrl}/${sessionId}/complete`, {
      method: "POST",
      headers: AGENT_HEADERS,
      body: JSON.stringify({ payment: { method: "__test__" } }),
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );
  const completeLatency = Math.round(performance.now() - completeStart);

  if (!completeResult.success) {
    steps.push({
      step: "checkout_complete",
      label: "Complete checkout",
      httpStatus: null,
      latencyMs: null,
      passed: false,
      skipped: false,
      note: "POST /checkout-sessions/{id}/complete timed out.",
    });
  } else {
    const status = completeResult.data.status;
    steps.push({
      step: "checkout_complete",
      label: "Complete checkout",
      httpStatus: status,
      latencyMs: completeLatency,
      passed: status < 500,
      skipped: false,
      note:
        status >= 500
          ? `Server error HTTP ${status}.`
          : status === 400 || status === 402
            ? `HTTP ${status} — payment validation correctly rejected test payment method.`
            : `HTTP ${status}`,
    });
  }

  // Step 6: Cancel checkout — POST /checkout-sessions/{id}/cancel
  const cancelStart = performance.now();
  const cancelResult = await resultify(() =>
    fetch(`${checkoutSessionsUrl}/${sessionId}/cancel`, {
      method: "POST",
      headers: AGENT_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );
  const cancelLatency = Math.round(performance.now() - cancelStart);

  if (!cancelResult.success) {
    steps.push({
      step: "checkout_cancel",
      label: "Cancel checkout",
      httpStatus: null,
      latencyMs: null,
      passed: false,
      skipped: false,
      note: "POST /checkout-sessions/{id}/cancel timed out.",
    });
  } else {
    const status = cancelResult.data.status;
    steps.push({
      step: "checkout_cancel",
      label: "Cancel checkout",
      httpStatus: status,
      latencyMs: cancelLatency,
      passed: status < 500,
      skipped: false,
      note: status >= 500 ? `Server error HTTP ${status}.` : `HTTP ${status}`,
    });
  }

  return steps;
};

const probeA2aEndpoint = async (
  serviceName: string,
  serviceLabel: string,
  endpoint: string,
): Promise<A2aProbeResult> => {
  const start = performance.now();

  const result = await resultify(() =>
    fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-A2A-Extensions":
          "https://ucp.dev/2026-04-08/specification/reference",
        "User-Agent": AGENT_HEADERS["User-Agent"],
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    }),
  );

  const latencyMs = Math.round(performance.now() - start);

  if (!result.success) {
    return {
      serviceName,
      serviceLabel,
      endpoint,
      reachable: false,
      httpStatus: null,
      latencyMs: null,
      agentCardFound: false,
      agentName: null,
      ucpExtensionPresent: false,
      error: "A2A endpoint did not respond within 8 s.",
    };
  }

  const response = result.data;
  const ucpExtensionPresent =
    response.headers.get("x-a2a-extensions") !== null ||
    response.headers.get("X-A2A-Extensions") !== null;

  let agentCardFound = false;
  let agentName: string | null = null;

  const originResult = resultify(() => new URL(endpoint).origin);
  if (originResult.success) {
    const cardResult = await resultify(() =>
      fetch(`${originResult.data}/.well-known/agent-card.json`, {
        headers: {
          Accept: "application/json",
          "User-Agent": AGENT_HEADERS["User-Agent"],
        },
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      }),
    );
    if (cardResult.success && cardResult.data.ok) {
      agentCardFound = true;
      const cardText = await resultify(() => cardResult.data.text());
      if (cardText.success) {
        type AgentCard = { name?: string };
        const card = resultify(() => JSON.parse(cardText.data) as AgentCard);
        if (card.success && typeof card.data.name === "string")
          agentName = card.data.name;
      }
    }
  }

  return {
    serviceName,
    serviceLabel,
    endpoint,
    reachable: response.status < 500,
    httpStatus: response.status,
    latencyMs,
    agentCardFound,
    agentName,
    ucpExtensionPresent,
    error:
      response.status >= 500 ? `Server error HTTP ${response.status}.` : null,
  };
};

const computeGrade = (
  probes: EndpointProbeResult[],
  mcpProbes: McpProbeResult[],
  a2aProbes: A2aProbeResult[],
  lifecycle: CheckoutStepResult[],
): { grade: AdvancedGrade; detail: string } => {
  const allProbesEmpty =
    probes.length === 0 && mcpProbes.length === 0 && a2aProbes.length === 0;
  if (allProbesEmpty) {
    return {
      grade: "C",
      detail: "No service endpoints with URLs declared in the UCP profile.",
    };
  }

  const serverErrors = [
    ...probes.filter((p) => p.httpStatus !== null && p.httpStatus >= 500),
    ...mcpProbes.filter((p) => p.httpStatus !== null && p.httpStatus >= 500),
    ...a2aProbes.filter((p) => p.httpStatus !== null && p.httpStatus >= 500),
    ...lifecycle.filter(
      (s) => !s.skipped && s.httpStatus !== null && s.httpStatus >= 500,
    ),
  ];

  if (serverErrors.length > 0) {
    return {
      grade: "F",
      detail: `${serverErrors.length} endpoint(s) returning server errors (5xx) — investigate before launch.`,
    };
  }

  const reachableCount = probes.filter((p) => p.reachable).length;
  const corsOk = probes.length === 0 || probes.every((p) => p.corsAllowed);
  const mcpReachableCount = mcpProbes.filter((p) => p.reachable).length;
  const a2aReachableCount = a2aProbes.filter((p) => p.reachable).length;
  const activeSteps = lifecycle.filter((s) => !s.skipped);
  const passedSteps = activeSteps.filter((s) => s.passed).length;
  const allRestReachable =
    probes.length === 0 || reachableCount === probes.length;
  const allMcpReachable =
    mcpProbes.length === 0 || mcpReachableCount === mcpProbes.length;
  const allA2aReachable =
    a2aProbes.length === 0 || a2aReachableCount === a2aProbes.length;

  if (
    allRestReachable &&
    allMcpReachable &&
    allA2aReachable &&
    corsOk &&
    activeSteps.length > 0 &&
    passedSteps === activeSteps.length
  ) {
    const parts: string[] = [];
    if (mcpProbes.length > 0) parts.push(`${mcpReachableCount} MCP`);
    if (a2aProbes.length > 0) parts.push(`${a2aReachableCount} A2A`);
    const note =
      parts.length > 0 ? `, ${parts.join(", ")} endpoint(s) responding` : "";
    return {
      grade: "A",
      detail: `All endpoints reachable${note}, CORS configured, checkout lifecycle validated.`,
    };
  }

  if (
    allRestReachable &&
    allMcpReachable &&
    allA2aReachable &&
    passedSteps >= Math.ceil(activeSteps.length / 2)
  ) {
    return {
      grade: "B",
      detail: `All endpoint(s) reachable${corsOk ? "" : " — CORS needs attention"}. Lifecycle partially validated.`,
    };
  }

  const issues: string[] = [];
  if (!allRestReachable)
    issues.push(
      `${reachableCount}/${probes.length} REST endpoint(s) reachable`,
    );
  if (!allMcpReachable)
    issues.push(
      `${mcpReachableCount}/${mcpProbes.length} MCP endpoint(s) reachable`,
    );
  if (!allA2aReachable)
    issues.push(
      `${a2aReachableCount}/${a2aProbes.length} A2A endpoint(s) reachable`,
    );
  if (!corsOk) issues.push("CORS not configured");
  return { grade: "C", detail: `${issues.join(". ")}. Review endpoint setup.` };
};

export const checkUCPAdvanced = async (
  domain: string,
): Promise<
  | { success: true; data: AdvancedCheckResult }
  | { success: false; error: string }
> => {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!cleaned) return { success: false, error: "Please enter a domain." };

  const profileResult = await resultify(() =>
    fetch(`https://${cleaned}/.well-known/ucp`, {
      headers: {
        Accept: "application/json",
        "UCP-Agent": AGENT_HEADERS["UCP-Agent"],
        "User-Agent": AGENT_HEADERS["User-Agent"],
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    }),
  );

  if (!profileResult.success) {
    return {
      success: false,
      error:
        "Could not reach the UCP profile endpoint. Run basic validation first.",
    };
  }

  const bodyText = await resultify(() => profileResult.data.text());
  if (!bodyText.success) {
    return {
      success: false,
      error: "Could not read UCP profile response body.",
    };
  }

  const profileParsed = resultify(() => JSON.parse(bodyText.data) as unknown);
  const profile = profileParsed.success ? profileParsed.data : null;

  if (!isObject(profile)) {
    return {
      success: false,
      error: "UCP profile is not valid JSON — run basic validation first.",
    };
  }

  // biome-ignore lint/complexity/useLiteralKeys: index signature property
  const root = isObject(profile["ucp"]) ? profile["ucp"] : profile;
  // biome-ignore lint/complexity/useLiteralKeys: index signature property
  const servicesRaw = root["services"];

  const serviceEndpoints: Array<{
    name: string;
    label: string;
    endpoint: string;
    transport: string | null;
  }> = [];

  if (isObject(servicesRaw)) {
    for (const [name, entries] of Object.entries(servicesRaw)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!isObject(entry)) continue;
        const { endpoint, transport } = entry;
        if (typeof endpoint === "string") {
          serviceEndpoints.push({
            name,
            label: KNOWN_SERVICE_LABELS[name] ?? name,
            endpoint,
            transport: typeof transport === "string" ? transport : null,
          });
        }
      }
    }
  }

  if (serviceEndpoints.length === 0) {
    return {
      success: true,
      data: {
        domain: cleaned,
        endpointProbes: [],
        mcpProbes: [],
        a2aProbes: [],
        checkoutLifecycle: [],
        grade: "C",
        gradeDetail:
          "No service endpoints with URLs declared in the UCP profile.",
      },
    };
  }

  const restEndpoints = serviceEndpoints.filter(
    (svc) => svc.transport !== "mcp" && svc.transport !== "a2a",
  );
  const mcpEndpoints = serviceEndpoints.filter(
    (svc) => svc.transport === "mcp",
  );
  const a2aEndpoints = serviceEndpoints.filter(
    (svc) => svc.transport === "a2a",
  );

  const [endpointProbes, mcpProbes, a2aProbes] = await Promise.all([
    Promise.all(
      restEndpoints.map((svc) =>
        probeEndpoint(svc.name, svc.label, svc.endpoint, svc.transport),
      ),
    ),
    Promise.all(
      mcpEndpoints.map((svc) =>
        probeMcpEndpoint(svc.name, svc.label, svc.endpoint),
      ),
    ),
    Promise.all(
      a2aEndpoints.map((svc) =>
        probeA2aEndpoint(svc.name, svc.label, svc.endpoint),
      ),
    ),
  ]);

  const shoppingService = restEndpoints.find(
    (svc) => svc.name === "dev.ucp.shopping" || svc.name.includes("shopping"),
  );

  const checkoutLifecycle = shoppingService
    ? await runCheckoutLifecycle(shoppingService.endpoint)
    : [];

  const { grade, detail } = computeGrade(
    endpointProbes,
    mcpProbes,
    a2aProbes,
    checkoutLifecycle,
  );

  return {
    success: true,
    data: {
      domain: cleaned,
      endpointProbes,
      mcpProbes,
      a2aProbes,
      checkoutLifecycle,
      grade,
      gradeDetail: detail,
    },
  };
};
