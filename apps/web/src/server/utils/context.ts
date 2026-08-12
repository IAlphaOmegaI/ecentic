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

/**
 * Secret-bearing argument names never reach telemetry — action arguments are
 * shipped to Sentry as a span attribute, and values like OAuth authorization
 * codes, tokens, and passwords must not be exfiltrated by observability.
 */
const SENSITIVE_ARGUMENT_PATTERN =
  /code|token|secret|password|credential|authorization|apikey|api_key/i;

// Depth-capped and cycle-guarded: arguments can carry rich runtime objects
// (Drizzle query nodes are circular — column → table → column), and telemetry
// needs a bounded sketch of them, not a faithful traversal.
const REDACTION_MAXIMUM_DEPTH = 6;

const redactArguments = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown => {
  if (depth > REDACTION_MAXIMUM_DEPTH) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value))
    return value.map((entry) => redactArguments(entry, depth + 1, seen));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_ARGUMENT_PATTERN.test(key)
        ? "[redacted]"
        : redactArguments(entry, depth + 1, seen),
    ]),
  );
};

/**
 * Base context: environment + Sentry span. No request APIs, no auth.
 * Safe for repositories, `"use cache"`, `generateStaticParams`, and other
 * static / non-request rails.
 */
export type InstrumentedContext = {
  environment: {
    deployment: string;
    version: string;
  };
  span: Sentry.Span & {
    addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => void;
  };
};

/**
 * Request rail context: instrumented base + Better Auth API.
 * Built by the request shell + `withAuth`.
 */
export type GenericContext = InstrumentedContext & {
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
  Context extends InstrumentedContext = InstrumentedContext,
  Return extends GenericResult = GenericResult,
> = (context: Context, ...args: never[]) => Promise<Return>;

export type InferredReturn<
  Context extends InstrumentedContext,
  T extends ContextedAction<Context>,
> = T extends ContextedAction<infer _, infer Return> ? Return : never;

export type OmittedContextParams<
  Action extends ContextedAction<Context>,
  Context extends InstrumentedContext = InstrumentedContext,
> = Action extends (context: Context, ...args: infer Args) => unknown
  ? Args
  : never;

let cache: (Omit<InstrumentedContext, "span"> & { span: null }) | undefined;

const define = async () => {
  if (cache) return cache;
  cache = {
    environment: {
      deployment: process.env.npm_package_name || "unknown",
      version: process.env.npm_package_version || "unknown",
    },
    // span is overwritten per call so it is never shared via the module cache
    span: null,
  };
  return cache;
};

type ShellOptions = {
  /** When true, wrap in Sentry server-action instrumentation (awaits `headers()`). */
  request: boolean;
};

/**
 * Wraps a function with a context and Sentry instrumentation.
 * The function must return a Result. Failures are captured (unless expected)
 * and serialized for client consumption when running in the client environment.
 */
const createShell = (options: ShellOptions) => {
  const impl = <
    T extends ContextedAction<Context>,
    Context extends InstrumentedContext = InstrumentedContext,
    ContextError extends Error = never,
  >(
    action: T,
    name: string = action.name,
    enhance: (
      base: InstrumentedContext,
    ) => Promise<Result<Context, ContextError>> = async (context) =>
      ({
        success: true,
        data: context as unknown as Context,
      }) as Result<Context, ContextError>,
  ) => {
    type Return = InferredReturn<Context, T>;

    type ReturnSuccess = UnwrapResult<Return>;
    type ReturnError = InferredError<Return>;
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

      span.setAttribute(
        "action.arguments",
        redactArguments(args) as typeof args,
      );

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

      const run = async () => {
        // A thrown exception (not a resultified failure) would otherwise escape
        // past every `captureException` site below and vanish from Sentry.
        // Normalize any throw into a failed `Result` so the reporting and the
        // caller's Result contract both still hold.
        const result = await (async () => {
          try {
            return await action(contextData, ...args);
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
      };

      if (!options.request) return run();

      return Sentry.withServerActionInstrumentation(
        name,
        { recordResponse: true, headers: await headers() },
        run,
      );
    };

    return handler as unknown as Handler;
  };

  return impl;
};

const instrumentedShell = createShell({ request: false });
const requestShell = createShell({ request: true });

export type WithContextParams<
  Context extends InstrumentedContext = InstrumentedContext,
  T extends ContextedAction<Context> = ContextedAction<Context>,
> = [Parameters<typeof instrumentedShell<T, Context>>[0], string?];

type ContextEnhancer<
  Success extends InstrumentedContext = InstrumentedContext,
  E extends Error = Error,
> = (base: InstrumentedContext) => Promise<Result<Success, E>>;

/**
 * A composable context enhancer that transforms one context into another.
 * Unlike `ContextEnhancer`, the input type is generic — allowing enhancers
 * to build on top of each other's output.
 */
export type Enhancer<
  In extends InstrumentedContext = InstrumentedContext,
  Out extends InstrumentedContext = InstrumentedContext,
  E extends Error = Error,
> = (context: In) => Promise<Result<Out, E>>;

/**
 * Composes two enhancers sequentially: the output of `first` feeds into `second`.
 * If `first` fails, `second` is never called.
 */
export const pipe = <
  A extends InstrumentedContext,
  B extends InstrumentedContext,
  C extends InstrumentedContext,
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

type Shell = ReturnType<typeof createShell>;

/**
 * A configured shell that is also chainable: it wraps actions directly and
 * exposes `append` to layer on another enhancer, returning a freshly-typed
 * builder so the context type evolves across the chain.
 */
type ContextBuilder<
  Out extends InstrumentedContext = InstrumentedContext,
  E extends Error = never,
> = {
  <A extends ContextedAction<Out>>(
    action: A,
    name?: string,
  ): ReturnType<typeof instrumentedShell<A, Out, E>>;
  append: <Next extends InstrumentedContext, E2 extends Error>(
    enhancer: Enhancer<Out, Next, E2>,
  ) => ContextBuilder<Next, E | E2>;
};

const builder = <Out extends InstrumentedContext, E extends Error>(
  shell: Shell,
  enhancer: Enhancer<InstrumentedContext, Out, E>,
): ContextBuilder<Out, E> =>
  Object.assign(
    <A extends ContextedAction<Out>>(action: A, name?: string) =>
      shell(action, name, enhancer),
    {
      append: <Next extends InstrumentedContext, E2 extends Error>(
        next: Enhancer<Out, Next, E2>,
      ) => builder(shell, pipe(enhancer, next)),
    },
  ) as unknown as ContextBuilder<Out, E>;

/**
 * Headers-free instrumentation. Use for repositories, static generation,
 * `"use cache"`, and any rail that must not touch request APIs.
 */
export const withInstrumentation = Object.assign(instrumentedShell, {
  append: <Out extends InstrumentedContext, E extends Error>(
    enhancer: Enhancer<InstrumentedContext, Out, E>,
  ) => builder(instrumentedShell, enhancer),
});

/**
 * Lazy Better Auth API. Kept off the instrumented base so static rails never
 * pull auth (and never need a request).
 */
export const withAuth: Enhancer<
  InstrumentedContext,
  GenericContext,
  never
> = async (context) => ({
  success: true,
  data: {
    ...context,
    auth: (await import("@/lib/auth")).auth.api,
  },
});

/**
 * Request rail: Sentry server-action instrumentation (`headers()`) + auth API.
 * `withContext.append(authenticate)` / `append(withDurable)` layer on top.
 */
export const withContext = builder(requestShell, withAuth);

export const defineWithContext = <T extends ContextEnhancer>(enhancer: T) => {
  type Return = Awaited<ReturnType<typeof enhancer>>;

  type EnhancedContext =
    UnwrapResult<Return> extends InstrumentedContext
      ? UnwrapResult<Return>
      : InstrumentedContext;

  type PotentialError = InferredError<Return>;

  type Augmentation = EnhancedContext extends InstrumentedContext
    ? EnhancedContext
    : InstrumentedContext;

  return <A extends ContextedAction<Augmentation>>(
    ...args: WithContextParams<EnhancedContext, A>
  ) =>
    requestShell<A, Augmentation, PotentialError>(
      args[0],
      args[1],
      pipe(
        withAuth,
        enhancer as Enhancer<GenericContext, Augmentation, PotentialError>,
      ),
    );
};

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
