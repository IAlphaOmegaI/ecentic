import * as Sentry from "@sentry/nextjs";
import type { Redis } from "@upstash/redis";
import type { InferredError, Result, UnwrapResult } from "@zenncore/utils";
import type { IsEqual } from "@zenncore/utils/types";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { db } from "../database";
import { redis } from "./durable";
import { type Brand, Environment } from "./environment";
import { ErrorProtocol, isExpected } from "./error";

export type GenericContext = {
  environment: {
    deployment: string;
    version: string;
  };
  span: Sentry.Span & {
    addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => void;
  };
  auth: typeof import("@/lib/auth").auth.api;
};

// Redis + db are an opt-in capability: actions that need them append `withDurable`
// (below) instead of every action carrying durable infrastructure it never uses.
export type DurableContext = GenericContext & {
  durable: {
    redis: Redis;
    db: typeof db;
  };
};

// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
type GenericResult = Result<any, Error> | Result<void, Error>;

export type ContextedAction<
  Context extends GenericContext = GenericContext,
  Return extends GenericResult = GenericResult,
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
  };
  return cache;
};
/**
 * Wraps a function with a context and Sentry instrumentation.
 * The function must return a Result. If the function returns a failure,
 * Sentry will be notified and the error will be captured.
 * Also the errors will be transpiled to a `SerializedError` so they can be consumed by the client.
 * If the function returns a success, the result will be returned.
 *
 * @param fn - The function to wrap. Must return a Result.
 * @param name - The name of the function. Used to identify the function in Sentry.
 * @returns The wrapped function. The function will have a type signature of `(...args)<Environment> => Result<T, Environment extends "client" ? ErrorProtocol.SerializedError : Error>` where `T` is inferred based on the input function, and `Error` will be an instance of `Error` or `ErrorProtocol.SerializedError` depending on the environment.
 *
 */
const withContextImpl = <
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
  type CombinedError =
    IsEqual<ContextError, never> extends true
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
    }) as Sentry.Span & {
      addBreadcrumb: typeof Sentry.addBreadcrumb;
    };

    span.addBreadcrumb = Sentry.addBreadcrumb;

    span.setAttribute("action.arguments", args);

    // span is passed as an overwrite to the base context so it wont be cached in the global cache. This is just a safety measure as normally each server function initiaties it's own server instance, and thus its own cache.
    const base = { ...(await define()), span };
    const context = await enhance(base);

    if (!context.success) {
      if (!isExpected(context.error)) Sentry.captureException(context.error);

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

    const contextData = context.data as Context;

    return Sentry.withServerActionInstrumentation(
      name,
      { recordResponse: true, headers: await headers() },
      async () => {
        // A thrown exception (not a resultified failure) would otherwise escape
        // past every `captureException` site below and vanish from Sentry.
        // Normalize any throw into a failed `Result` so the reporting and the
        // caller's Result contract both still hold.
        const result = await (async () => {
          try {
            return await fn(contextData, ...args);
          } catch (thrown) {
            // Next signals control flow by throwing: `redirect()` and
            // `notFound()` throw a plain Error carrying a `digest`, and under
            // `cacheComponents` a dynamic read (`cookies()`, `headers()`) throws
            // a prerender bailout. Catching those as failures would strand the
            // navigation and break PPR, so hand them back to Next untouched.
            unstable_rethrow(thrown);

            const error =
              thrown instanceof Error ? thrown : new Error(String(thrown));
            return { success: false as const, error };
          }
        })();

        if (!result.success) {
          // Expected failures (business rules like a store already claimed by
          // another account) are shown to the user, not reported as defects.
          if (!isExpected(result.error)) Sentry.captureException(result.error);

          contextData.span.recordException(result.error);

          contextData.span.setStatus({
            code: 2,
            message: result.error.message,
          });

          contextData.span.end();

          const error =
            environment === Environment.CLIENT
              ? ErrorProtocol.serialize(result.error)
              : result.error;

          return {
            success: false,
            error,
          };
        }

        contextData.span.setStatus({ code: 1 });

        contextData.span.end();

        return result as Result<
          ReturnSuccess,
          CombinedError | ErrorProtocol.SerializedError<CombinedError>
        >;
      },
    );
  };

  return handler as unknown as Handler;
};

// Chainable, instrumented context builder. `withContext.append(a).append(b)`
// composes enhancers left-to-right and evolves the context type across the chain
// — the fluent alternative to nesting `pipe(pipe(a, b), c)`. `Object.assign`
// (not `withContext.append = …`) so tsc keeps the generic call signature.
export const withContext = Object.assign(withContextImpl, {
  append: <Out extends GenericContext, E extends Error>(
    enhancer: Enhancer<GenericContext, Out, E>,
  ) => builder(enhancer),
});

export type WithContextParams<
  Context extends GenericContext = GenericContext,
  T extends ContextedAction<Context> = ContextedAction<Context>,
> = [
  Parameters<typeof withContextImpl<T, Context>>[0],
  Parameters<typeof withContextImpl<T, Context>>[1],
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

/**
 * A composable context enhancer that transforms one context into another.
 * Unlike `ContextEnhancer`, the input type is generic — allowing enhancers
 * to build on top of each other's output.
 */
export type Enhancer<
  In extends GenericContext = GenericContext,
  Out extends GenericContext = GenericContext,
  E extends Error = Error,
> = (context: In) => Promise<Result<Out, E>>;

/**
 * Composes two enhancers sequentially: the output of `first` feeds into `second`.
 * If `first` fails, `second` is never called.
 *
 * @example
 * ```ts
 * const withAuthorization = (roles) =>
 *   defineWithContext(pipe(authenticate, authorize(roles)));
 * ```
 */
export const pipe = <
  A extends GenericContext,
  B extends GenericContext,
  C extends GenericContext,
  E1 extends Error,
  E2 extends Error,
>(
  first: Enhancer<A, B, E1>,
  second: Enhancer<B, C, E2>,
): Enhancer<A, C, E1 | E2> => {
  return async (context: A) => {
    const result = await first(context);
    if (!result.success) return result as { success: false; error: E1 | E2 };
    return second(result.data as B) as Promise<Result<C, E1 | E2>>;
  };
};

/**
 * A configured `withContext` that is *also* chainable: it wraps actions directly
 * (like `defineWithContext`) and exposes `append` to layer on another enhancer,
 * returning a freshly-typed builder so the context type evolves across the chain.
 *
 * The call signature mirrors what `defineWithContext(enhancer)` returns, but is
 * written directly via `withContextImpl<A, Out, E>` (a valid instantiation)
 * rather than `ReturnType<typeof defineWithContext<Enhancer<…, Out, …>>>` — the
 * latter can't prove a *generic* `Out` satisfies the enhancer constraint (the
 * `Result` void-branch makes `Out | undefined` look possible).
 */
type ContextBuilder<
  Out extends GenericContext = GenericContext,
  E extends Error = never,
> = {
  <A extends ContextedAction<Out>>(
    action: A,
    name?: string,
  ): ReturnType<typeof withContextImpl<A, Out, E>>;
  append: <Next extends GenericContext, E2 extends Error>(
    enhancer: Enhancer<Out, Next, E2>,
  ) => ContextBuilder<Next, E | E2>;
};

const builder = <Out extends GenericContext, E extends Error>(
  enhancer: Enhancer<GenericContext, Out, E>,
): ContextBuilder<Out, E> =>
  Object.assign(
    // Cast to a concrete-`Out` enhancer so `defineWithContext`'s constraint is
    // satisfied; the runtime enhancer is unchanged and the result is re-typed.
    defineWithContext(
      enhancer as unknown as Enhancer<GenericContext, GenericContext, E>,
    ),
    {
      append: <Next extends GenericContext, E2 extends Error>(
        next: Enhancer<Out, Next, E2>,
      ) => builder(pipe(enhancer, next)),
    },
  ) as unknown as ContextBuilder<Out, E>;

/**
 * Redis + db as an appendable capability. Actions that read `context.durable`
 * opt in via `withContext.append(withDurable)`; the rest never carry it.
 */
export const withDurable: Enhancer<
  GenericContext,
  DurableContext,
  never
> = async (base) => ({
  success: true,
  data: { ...base, durable: { redis, db } },
});
