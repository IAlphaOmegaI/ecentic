import { describe, expect, test } from "bun:test";
import {
  ConflictError,
  InvalidSignatureError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
  UntrustedRequestError,
  ValidationError,
} from "../utils/error";
import { respond } from "../utils/http";

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
