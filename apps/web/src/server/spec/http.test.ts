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
  ConflictError,
  InvalidSignatureError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
  UntrustedRequestError,
  ValidationError,
} from "../utils/error";
import { read as readBody, request, respond } from "../utils/http";

const read = async (response: Response) => ({
  status: response.status,
  body: (await response.json()) as Record<string, unknown>,
});

describe("respond", () => {
  test("wraps a success in the envelope the cron routes returned by hand", async () => {
    const { status, body } = await read(
      respond({ success: true, data: { scanned: 3 } }),
    );

    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { scanned: 3 } });
  });

  test("honours an explicit success status", async () => {
    const { status } = await read(
      respond({ success: true, data: { id: "a" } }, { status: 201 }),
    );

    expect(status).toBe(201);
  });

  test.each([
    [new UnauthenticatedError("nope"), 401],
    // Shopify requires a 401 from the mandatory compliance webhooks when the
    // HMAC does not verify — this row is that contract.
    [new InvalidSignatureError("nope"), 401],
    // The cron / on-demand-purge guard answers the same 401 for a bearer that
    // does not match, so a rejected caller cannot tell the rails apart.
    [new UntrustedRequestError("nope"), 401],
    [new UnauthorizedError("nope"), 403],
    [new NotFoundError("nope"), 404],
    [new ConflictError("nope"), 409],
    [new ValidationError("nope"), 422],
  ])("maps %s by class", async (error, expected) => {
    const { status } = await read(respond({ success: false, error }));
    expect(status).toBe(expected);
  });

  test("an error's own statusCode beats the class map", async () => {
    // How the UCP events action keeps returning 400 for an invalid payload,
    // which the store plugin has coded against, without a bespoke error class.
    const { status } = await read(
      respond({
        success: false,
        error: new ValidationError("Invalid payload", { statusCode: 400 }),
      }),
    );

    expect(status).toBe(400);
  });

  test("an unrecognised error is a 500, not a guessed 4xx", async () => {
    const { status, body } = await read(
      respond({ success: false, error: new Error("boom") }),
    );

    expect(status).toBe(500);
    expect(body).toEqual({ success: false, error: "boom" });
  });
});

// ---------------------------------------------------------------------------
// Guarded requests — URLs a browser handed us (the landing hero's store field).
// The guard only enforces in production (local stores live on private hosts),
// so these run with NODE_ENV flipped. IP literals keep DNS off the network.
// ---------------------------------------------------------------------------

describe("request with guard", () => {
  const PUBLIC = "https://93.184.215.14";
  const environment = process.env.NODE_ENV;
  const fetchSpy = spyOn(globalThis, "fetch");

  beforeEach(() => {
    Reflect.set(process.env, "NODE_ENV", "production");
    fetchSpy.mockReset();
  });

  afterEach(() => {
    Reflect.set(process.env, "NODE_ENV", environment);
  });

  afterAll(() => fetchSpy.mockRestore());

  const redirect = (location: string) =>
    new Response(null, { status: 302, headers: { location } });

  test("refuses a private host before any request leaves", async () => {
    const result = await request("https://10.0.0.1/", {}, { guard: true });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.name).toBe("validation-error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("refuses a non-default port on a public host", async () => {
    const result = await request(`${PUBLIC}:8443/`, {}, { guard: true });

    expect(result.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("re-checks every redirect hop — a public URL cannot bounce inward", async () => {
    fetchSpy.mockResolvedValueOnce(redirect("https://127.0.0.1/admin"));

    const result = await request(
      `${PUBLIC}/products.json`,
      {},
      { guard: true },
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.name).toBe("validation-error");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  test("follows public redirects by hand to the answering hop", async () => {
    fetchSpy
      .mockResolvedValueOnce(redirect("/www/"))
      .mockResolvedValueOnce(new Response("home", { status: 200 }));

    const result = await request(PUBLIC, {}, { guard: true });

    expect(result.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]?.[0])).toBe(`${PUBLIC}/www/`);
  });

  test("gives up after five redirects", async () => {
    // A redirect carries no body, so one response can answer every hop.
    fetchSpy.mockResolvedValue(redirect(`${PUBLIC}/loop`));

    const result = await request(PUBLIC, {}, { guard: true });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.name).toBe("request-error");
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  test("identifies itself unless the caller chose a user agent", async () => {
    fetchSpy.mockResolvedValue(new Response("ok"));

    await request(PUBLIC, {}, { guard: true });
    await request(
      PUBLIC,
      { headers: { "User-Agent": "Custom/1.0" } },
      { guard: true },
    );

    const agents = fetchSpy.mock.calls.map((call) =>
      new Headers(call[1]?.headers).get("user-agent"),
    );
    expect(agents[0]).toContain("Ecentic");
    expect(agents[1]).toBe("Custom/1.0");
  });
});

describe("read", () => {
  test("returns a body within its budget", async () => {
    const body = await readBody(new Response("storefront"), { limit: 100 });

    expect(body).toEqual({ success: true, data: "storefront" });
  });

  test("refuses — never truncates — a body over its budget", async () => {
    const body = await readBody(new Response("x".repeat(64)), { limit: 16 });

    expect(body.success).toBe(false);
    if (!body.success) {
      expect(body.error.message).toBe("Response too large");
      expect(body.error.name).toBe("response-too-large-error");
    }
  });
});
