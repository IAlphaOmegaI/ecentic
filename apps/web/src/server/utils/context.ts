import * as Sentry from "@sentry/nextjs";
import {
  resultify,
  type Result,
  type UnwrapResult,
  type InferredError,
} from "@zenncore/utils";
import { type Brand, Environment } from "./environment";
import { ErrorProtocol } from "./error";
import { upload } from "../app/storage";
import type { UploadThingError } from "uploadthing/server";

export type GenericContext = {
  environment: {
    deployment: string;
    version: string;
  };
  span: Sentry.Span;
  auth: typeof import("@/lib/auth").auth.api;
  storage: {
    upload: (
      _slug: string,
      options: { files: File[] },
    ) => Promise<Result<{ ufsUrl: string }[], UploadThingError>>;
  };
};

export type ContextedAction<
  Context extends GenericContext = GenericContext,
  // biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
  Return extends Result<any, Error> = Result<any, Error>,
> = (context: Context, ...args: never[]) => Promise<Return>;

export type InferredReturn<
  Context extends GenericContext,
  T extends ContextedAction<Context>,
> = T extends ContextedAction<infer _, infer Return> ? Return : never;

export type OmittedContextParams<
  Action extends ContextedAction<Context>,
  Context extends GenericContext = GenericContext,
> = Action extends (context: Context, ...args: infer Args) => unknown
  ? Args
  : never;

let cache: GenericContext | undefined;

const define = async () => {
  if (cache) return cache;
  cache = {
    environment: {
      deployment: process.env.npm_package_name || "unknown",
      version: process.env.npm_package_version || "unknown",
    },
    // span shouldn't be defined here, it should be defined in the function that uses the context so it wont be cached
    span: null!,
    auth: (await import("@/lib/auth")).auth.api,
    storage: {
      upload: async (_slug, options) =>
        await resultify(() => upload(options.files)),
    },
  };
  return cache;
};
/**
 * Wraps a function with a context and Sentry instrumentation.
 * The function must return a Result. If the function returns a failure,
 * Sentry will be notified and the error will be captured.
 * Also the errors will be transpiled to a `TranspiledError` so they can be consumed by the client.
 * If the function returns a success, the result will be returned.
 *
 * @param fn - The function to wrap. Must return a Result.
 * @param name - The name of the function. Used to identify the function in Sentry.
 * @returns The wrapped function. The function will have a type signature of `(...args)<Environment> => Result<T, Environment extends "client" ? ErrorProtocol.SerializedError : Error>` where `T` is inferred based on the input function, and `Error` will be an instance of `Error` or `ErrorProtocol.SerializedError` depending on the environment.
 *
 */
export const withContext = <
  T extends ContextedAction<Context>,
  Context extends GenericContext = GenericContext,
  ContextError extends Error = never,
>(
  fn: T,
  name: string = fn.name,
  enhance: (
    base: GenericContext,
  ) => Promise<Result<Context, ContextError>> = async (context) =>
    ({
      success: true,
      data: context as unknown as Context,
    }) as Result<Context, ContextError>,
) => {
  type Return = InferredReturn<Context, T>;

  type ReturnSuccess = UnwrapResult<Return>;
  type ReturnError = InferredError<Return>;
  // Simplify ReturnError | never to ReturnError
  type CombinedError = [ContextError] extends [never]
    ? ReturnError
    : ReturnError | ContextError;

  type Handler = {
    (
      ...args: OmittedContextParams<T, Context>
    ): Promise<
      Result<ReturnSuccess, ErrorProtocol.SerializedError<CombinedError>>
    >;
    <Env extends Environment>(
      environment: Env,
      ...args: OmittedContextParams<T, Context>
    ): Promise<
      Result<
        ReturnSuccess,
        Env extends Brand<"client">
          ? ErrorProtocol.SerializedError<CombinedError>
          : CombinedError
      >
    >;
  };

  const handler = async (
    ...params:
      | OmittedContextParams<T, Context>
      | [Environment, ...OmittedContextParams<T, Context>]
  ) => {
    const [environment, ...args] = (
      params[0] === Environment.SERVER || params[0] === Environment.CLIENT
        ? [params[0], ...params.slice(1)]
        : [Environment.CLIENT, ...params]
    ) as [Environment, ...OmittedContextParams<T, Context>];

    const span = Sentry.startInactiveSpan({
      name,
      op: "server",
    });

    span.setAttribute("action.arguments", args);

    // span is passed as an overwrite to the base context so it wont be cached in the global cache. This is just a safety measure as normally each server function initiaties it's own server instance, and thus its own cache.
    const base = { ...(await define()), span };
    const context = await enhance(base);

    if (!context.success) {
      Sentry.captureException(context.error);

      span.recordException(context.error);
      span.setStatus({ code: 2, message: context.error.message });

      span.end();

      const error =
        environment === Environment.CLIENT
          ? ErrorProtocol.serialize(context.error)
          : context.error;

      return {
        success: false,
        error,
      };
    }

    return Sentry.withServerActionInstrumentation(
      name,
      { recordResponse: true },
      async () => {
        const result = await fn(context.data as Context, ...args);

        if (!result.success) {
          Sentry.captureException(result.error);
          context.data.span.recordException(result.error);

          context.data.span.setStatus({
            code: 2,
            message: result.error.message,
          });

          context.data.span.end();

          const error =
            environment === Environment.CLIENT
              ? ErrorProtocol.serialize(result.error)
              : result.error;

          return {
            success: false,
            error,
          };
        }

        context.data.span.setStatus({ code: 1 });

        context.data.span.end();

        return result as Result<
          ReturnSuccess,
          CombinedError | ErrorProtocol.SerializedError<CombinedError>
        >;
      },
    );
  };

  return handler as unknown as Handler;
};

export type WithContextParams<
  Context extends GenericContext = GenericContext,
  T extends ContextedAction<Context> = ContextedAction<Context>,
> = [
  Parameters<typeof withContext<T, Context>>[0],
  Parameters<typeof withContext<T, Context>>[1],
];

type ContextEnhancer<
  Success extends GenericContext = GenericContext,
  E extends Error = Error,
> = (base: GenericContext) => Promise<Result<Success, E>>;

export const defineWithContext = <T extends ContextEnhancer>(enhancer: T) => {
  type Return = Awaited<ReturnType<typeof enhancer>>;

  type EnhancedContext =
    UnwrapResult<Return> extends GenericContext
      ? UnwrapResult<Return>
      : GenericContext;

  type PotentialError = InferredError<Return>;

  type Augmentation = EnhancedContext extends GenericContext
    ? EnhancedContext
    : GenericContext;

  return <A extends ContextedAction<Augmentation>>(
    ...args: WithContextParams<EnhancedContext, A>
    // @ts-expect-error - we want to allow the context enhancer to return a different type than the context
  ) => withContext<A, Augmentation, PotentialError>(...args, enhancer);
};
