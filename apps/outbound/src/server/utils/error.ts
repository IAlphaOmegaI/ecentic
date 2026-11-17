type Constructor = new (...arguments_: never[]) => Error;

export const error = <Name extends string>(
  name: Name,
  parent: Constructor = Error,
) => {
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
  Object.defineProperty(ErrorClass, "errorName", { value: name });
  return ErrorClass as typeof ErrorClass & { readonly errorName: Name };
};

export class DatabaseError extends error("database-error") {}
export class UniqueConstraintError extends error(
  "unique-constraint-error",
  DatabaseError,
) {}
export class NotFoundError extends error("not-found-error", DatabaseError) {}
export class RequestError extends error("request-error") {}
export class ResponseTooLargeError extends error(
  "response-too-large-error",
  RequestError,
) {}
export class ValidationError extends error("validation-error", RequestError) {}
export class ConflictError extends error("conflict-error", RequestError) {}
export class TimeoutError extends error("timeout-error", RequestError) {}
export class ParseError extends error("parse-error", RequestError) {}
export class AuthenticationError extends error("authentication-error") {}
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

const transient = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
]);

export const isTransientConnectionError = (
  failure: unknown,
  depth = 0,
): boolean => {
  if (!(failure instanceof Error) || depth > 3) return false;
  const { code } = failure as Error & { code?: unknown };
  if (typeof code === "string" && transient.has(code)) return true;
  if (code === "08P01" && failure.message === "Authentication timed out")
    return true;
  return isTransientConnectionError(failure.cause, depth + 1);
};

export namespace ErrorProtocol {
  export type SerializedError<Failure extends Error = Error> = {
    name: Failure["name"];
    message: Failure["message"];
    "~prototype"?: Failure;
  };

  // Internal stacks, query arguments and provider details stay server-side.
  export const serialize = <Failure extends Error>(
    failure: Failure,
  ): SerializedError<Failure> => ({
    name: failure.name,
    message: failure.message,
  });
}
