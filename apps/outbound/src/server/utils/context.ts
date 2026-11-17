import type { InferredError, Result, UnwrapResult } from "@zenncore/utils";
import { unstable_rethrow } from "next/navigation";
import { type Brand, Environment } from "./environment";
import { ErrorProtocol } from "./error";

export type InstrumentedContext = {
  environment: { deployment: string; version: string };
};
export type GenericContext = InstrumentedContext & {
  auth: typeof import("@/lib/auth").auth.api;
};

// biome-ignore lint/suspicious/noExplicitAny: Action inference must include every Result payload.
type GenericResult = Result<any, Error> | Result<void, Error>;
export type ContextedAction<
  Context extends InstrumentedContext = InstrumentedContext,
> = (context: Context, ...arguments_: never[]) => Promise<GenericResult>;
type Arguments<Action, Context> = Action extends (
  context: Context,
  ...arguments_: infer Arguments
) => unknown
  ? Arguments
  : never;
export type Enhancer<
  Input extends InstrumentedContext = InstrumentedContext,
  Output extends InstrumentedContext = InstrumentedContext,
  Failure extends Error = Error,
> = (context: Input) => Promise<Result<Output, Failure>>;

const shell = <
  Action extends ContextedAction<Context>,
  Context extends InstrumentedContext = InstrumentedContext,
  ContextError extends Error = never,
>(
  action: Action,
  _name: string = action.name,
  enhance: Enhancer<InstrumentedContext, Context, ContextError> = async (
    context,
  ) => ({ success: true, data: context as Context }),
) => {
  type Return = Awaited<ReturnType<Action>>;
  type Payload = UnwrapResult<Return>;
  type Failure = InferredError<Return> | ContextError | Error;
  type Handler = {
    (
      ...arguments_: Arguments<Action, Context>
    ): Promise<Result<Payload, ErrorProtocol.SerializedError<Failure>>>;
    <Mode extends Environment>(
      environment: Mode,
      ...arguments_: Arguments<Action, Context>
    ): Promise<
      Result<
        Payload,
        Mode extends Brand<"client">
          ? ErrorProtocol.SerializedError<Failure>
          : Failure
      >
    >;
  };
  const handler = async (...parameters: unknown[]) => {
    const explicit =
      parameters[0] === Environment.SERVER ||
      parameters[0] === Environment.CLIENT;
    const environment = explicit ? parameters[0] : Environment.CLIENT;
    const arguments_ = (
      explicit ? parameters.slice(1) : parameters
    ) as Arguments<Action, Context>;
    const result = await (async () => {
      try {
        const context = await enhance({
          environment: { deployment: "outbound", version: "0.1.0" },
        });
        if (!context.success) return context;
        return await action(context.data as Context, ...arguments_);
      } catch (failure) {
        unstable_rethrow(failure);
        return {
          success: false as const,
          error:
            failure instanceof Error ? failure : new Error(String(failure)),
        };
      }
    })();
    if (result.success) return result;
    return {
      success: false as const,
      error:
        environment === Environment.SERVER
          ? result.error
          : ErrorProtocol.serialize(result.error),
    };
  };
  return handler as Handler;
};

export type WithContextParams<
  Context extends InstrumentedContext = InstrumentedContext,
  Action extends ContextedAction<Context> = ContextedAction<Context>,
> = [Action, string?];

type ContextBuilder<
  Context extends InstrumentedContext,
  Failure extends Error,
> = {
  <Action extends ContextedAction<Context>>(
    action: Action,
    name?: string,
  ): ReturnType<typeof shell<Action, Context, Failure>>;
  append: <Next extends InstrumentedContext, NextError extends Error>(
    enhancer: Enhancer<Context, Next, NextError>,
  ) => ContextBuilder<Next, Failure | NextError>;
};

const builder = <Context extends InstrumentedContext, Failure extends Error>(
  enhancer: Enhancer<InstrumentedContext, Context, Failure>,
): ContextBuilder<Context, Failure> =>
  Object.assign(
    <Action extends ContextedAction<Context>>(action: Action, name?: string) =>
      shell(action, name, enhancer),
    {
      append: <Next extends InstrumentedContext, NextError extends Error>(
        next: Enhancer<Context, Next, NextError>,
      ) =>
        builder<Next, Failure | NextError>(async (base) => {
          const context = await enhancer(base);
          if (!context.success) return { success: false, error: context.error };
          return next(context.data as Context);
        }),
    },
  );

// Repositories never load auth or read request headers.
export const withInstrumentation = shell;
export const withContext = builder<GenericContext, never>(async (base) => ({
  success: true,
  data: { ...base, auth: (await import("@/lib/auth")).auth.api },
}));
