import type { EmptyObject } from "@zenncore/utils/types";

type Constructor<T extends EmptyObject = EmptyObject> = new (
  ...args: never[]
) => T;

/**
 * Names of errors that describe an anticipated business rule rather than a
 * defect — see `isExpected`. Keyed by name because `error()` re-points instances
 * at their parent's prototype (ruling out `instanceof` on the leaf class) and
 * because the name is the one field that survives serialization to the client.
 */
const expected = new Set<string>();

export const error = <Name extends string>(
  name: Name,
  parent: Constructor = Error,
  options?: { expected?: boolean },
) => {
  if (options?.expected) expected.add(name);

  const ErrorClass = class extends Error {
    override name: Name;
    statusCode?: number;
    constructor(
      message: string,
      options?: ErrorOptions & { statusCode?: number },
    ) {
      super(message, options);
      this.name = name;
      this.statusCode = options?.statusCode;
      Object.setPrototypeOf(this, parent.prototype);
    }
  };
  // Set the static name property at runtime with the literal value
  Object.defineProperty(ErrorClass, "name", {
    value: name,
    writable: false,
    enumerable: false,
    configurable: true,
  });
  return ErrorClass as typeof ErrorClass & { readonly name: Name };
};

export class DatabaseError extends error("database-error" as const) {}

export class UniqueConstraintError extends error(
  "unique-constraint-error",
  DatabaseError,
) {}

export class NotFoundError extends error("not-found-error", DatabaseError) {}

export class RequestError extends error("request-error", Error) {}

/**
 * Input that fails a business rule before it reaches the database — an empty
 * selection, a malformed URL. The user is told what to correct, so it is never
 * reported to Sentry.
 */
export class ValidationError extends error("validation-error", RequestError, {
  expected: true,
}) {}

/**
 * A well-formed request that conflicts with the current state of the system —
 * e.g. connecting a store another account already owns. The user is told what
 * happened and what to do about it; nothing is broken, so it is never reported
 * to Sentry.
 */
export class ConflictError extends error("conflict-error", RequestError, {
  expected: true,
}) {}

export class TimeoutError extends error("timeout-error", RequestError) {}

export class ParseError extends error("parse-error", RequestError) {}

export class AuthenticationError extends error("authentication-error", Error) {}

export class UnauthenticatedError extends error(
  "unauthenticated-error",
  AuthenticationError,
) {}

export class UnauthorizedError extends error(
  "unauthorized-error",
  AuthenticationError,
) {}

export class InvalidCredentialsError extends error(
  "invalid-credentials",
  AuthenticationError,
) {}

/**
 * A public endpoint turned away a caller that failed its signature check — a
 * webhook HMAC, a signed event. Unlike the other authentication failures this
 * one is the control doing its job against traffic that was never trusted:
 * forged posts, scanners, and Shopify's own app-review probe, which sends a
 * deliberately invalid HMAC to confirm the endpoint answers 401. Nothing is
 * broken, so it is never reported as a defect — endpoints that want a record
 * capture it themselves at `warning`, with the delivery it arrived on.
 */
export class InvalidSignatureError extends error(
  "invalid-signature",
  AuthenticationError,
  { expected: true },
) {}

/**
 * A public endpoint turned away a caller that presented the wrong shared secret
 * — or none. The sibling of `InvalidSignatureError` for the rails that check a
 * bearer token rather than a signature: `/api/cron/*` and the on-demand cache
 * purge, whose URLs anyone can POST. Same reasoning, so same treatment — never a
 * defect, and the guard records its own rejections at `warning` so a scanner
 * finding the endpoint does not open an issue while a real caller failing auth
 * is still visible.
 */
export class UntrustedRequestError extends error(
  "untrusted-request",
  AuthenticationError,
  { expected: true },
) {}

/**
 * Whether an error is a failure the product anticipates and handles — a business
 * rule the user can act on — rather than a defect. Expected errors still travel
 * as failed `Result`s and still reach the user, but `withContext` does not report
 * them to Sentry.
 */
export const isExpected = (error: Error) => expected.has(error.name);

/**
 * Driver codes that mean the database connection died, not that Postgres
 * rejected the query. Node reports a socket that stopped answering as
 * `ETIMEDOUT`, `ECONNRESET` or `EPIPE`; postgres.js raises its own `CONNECTION_*`
 * codes when it notices the stream went away underneath a pending query.
 *
 * `CONNECT_TIMEOUT` was excluded at first on the theory that it means the
 * database was unreachable for the whole `connect_timeout` (ECENTIC-CD), so a
 * retry could only double the hang before the same failure. ECENTIC-D9 broke
 * the theory: one connect stalled past the full window while the three sibling
 * reads in the same `Promise.all` connected and returned — the pooler was
 * healthy and simply sat on one attempt. A timed-out connect never reached
 * Postgres, so replaying it is as safe as the dead-socket replays above; the
 * price is that a genuine outage now hangs for two `connect_timeout` windows
 * instead of one before failing.
 */
const TRANSIENT_CONNECTION_CODES: ReadonlySet<string> = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
]);

/**
 * Whether a database failure was the connection dying rather than the query
 * being rejected — the difference between "safe to run again" and "will fail
 * identically forever". See `resultifyRead` in `repository.ts` for the retry
 * this gates.
 *
 * Walks the `cause` chain instead of reading one fixed depth: Drizzle wraps
 * driver failures in `DrizzleQueryError` and hangs the original on `cause`,
 * while postgres.js hands Node's socket error straight through rather than
 * wrapping it, so the code can sit at either level.
 */
export const isTransientConnectionError = (
  error: unknown,
  depth = 0,
): boolean => {
  if (!(error instanceof Error) || depth > 3) return false;

  const { code } = error as Error & { code?: unknown };
  if (typeof code === "string" && TRANSIENT_CONNECTION_CODES.has(code))
    return true;

  return isTransientConnectionError(error.cause, depth + 1);
};

export namespace ErrorProtocol {
  export type SerializedError<E extends Error = Error> = {
    name: E["name"];
    message: E["message"];
    stack?: E["stack"];
    /**
     * @internal
     *
     * The prototype of the error - A type only construct used to type out the deserialized error.
     *
     */
    "~prototype"?: E;
  };

  const map = {
    [DatabaseError.name]: DatabaseError,
    [UniqueConstraintError.name]: UniqueConstraintError,
    [ValidationError.name]: ValidationError,
    [NotFoundError.name]: NotFoundError,
    [RequestError.name]: RequestError,
    [ConflictError.name]: ConflictError,
    [TimeoutError.name]: TimeoutError,
    [ParseError.name]: ParseError,
    [UnauthenticatedError.name]: UnauthenticatedError,
    [UnauthorizedError.name]: UnauthorizedError,
    [InvalidSignatureError.name]: InvalidSignatureError,
    [UntrustedRequestError.name]: UntrustedRequestError,
  };

  export const serialize = <E extends Error = Error>(
    error: E,
  ): SerializedError<E> => {
    const dummy: { stack?: string } = {};
    Error.captureStackTrace(dummy, serialize);
    const callsite = dummy.stack?.split("\n")[1]?.trim();

    return {
      name: error.name,
      message: error.message,
      stack: callsite
        ? `Serialized at ${callsite}\n${error.stack}`
        : error.stack,
    };
  };

  export const deserialize = <E extends Error = Error>(
    error: SerializedError<E>,
  ): E => {
    const Constructor = map[error.name as keyof typeof map] ?? Error;
    const e = new Constructor(error.message) as E;

    const dummy: { stack?: string } = {};
    Error.captureStackTrace(dummy, deserialize);
    const callsite = dummy.stack?.split("\n")[1]?.trim();

    e.stack = callsite
      ? `Deserialized at ${callsite}\n${error.stack}`
      : error.stack;

    return e;
  };
}
