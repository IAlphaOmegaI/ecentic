import type { EmptyObject } from "@zenncore/utils/types";

type Constructor<T extends EmptyObject = EmptyObject> = new (
  ...args: never[]
) => T;

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

export class ValidationError extends error("validation-error", DatabaseError) {}

export class NotFoundError extends error("not-found-error", DatabaseError) {}

export class RequestError extends error("request-error", Error) {}

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
    [TimeoutError.name]: TimeoutError,
    [ParseError.name]: ParseError,
    [UnauthenticatedError.name]: UnauthenticatedError,
    [UnauthorizedError.name]: UnauthorizedError,
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
