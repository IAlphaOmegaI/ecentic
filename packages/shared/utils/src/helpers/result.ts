export type Result<T = void, E = string> =
  | (T extends void
      ? {
          success: true;
        }
      : {
          success: true;
          data: T;
        })
  | {
      success: false;
      error: E;
    };

export function resultify<
  T extends (...args: unknown[]) => Promise<unknown>,
  E = Error,
>(fn: T): Promise<Result<Awaited<ReturnType<T>>, E>>;

export function resultify<T extends (...args: unknown[]) => unknown, E = Error>(
  fn: T,
): Result<ReturnType<T>, E>;

export function resultify<
  T extends
    | ((...args: unknown[]) => unknown)
    | ((...args: unknown[]) => Promise<unknown>),
  E = Error,
>(
  fn: T,
): Promise<Result<Awaited<ReturnType<T>>, E>> | Result<ReturnType<T>, E> {
  try {
    const result = fn();

    if (result instanceof Promise) {
      const handler = async (): Promise<Result<Awaited<ReturnType<T>>, E>> => {
        const data = await result;
        return {
          success: true,
          data,
        } as Result<Awaited<ReturnType<T>>, E>;
      };

      return handler();
    }

    return {
      success: true,
      data: result,
    } as Result<ReturnType<T>, E>;
  } catch (error) {
    return {
      success: false,
      error: error as E,
    };
  }
}

// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
export type UnwrapResult<T extends Result<any>> = "data" extends keyof Extract<
  T,
  { success: true }
>
  ? Extract<T, { success: true }>["data"]
  : undefined;

// Async overload
// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
export function unwrapResult<T extends Promise<Result<any>>>(
  result: T,
): Promise<UnwrapResult<Awaited<T>>>;

// Sync overload
// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
export function unwrapResult<T extends Result<any>>(result: T): UnwrapResult<T>;

// Implementation
// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
export function unwrapResult<T extends Result<any> | Promise<Result<any>>>(
  result: T,
): Promise<UnwrapResult<Awaited<T>>> | UnwrapResult<Awaited<T>> {
  if (!(result instanceof Promise)) {
    if (!result.success) throw result.error;
    return ("data" in result ? result.data : undefined) as UnwrapResult<
      Awaited<T>
    >;
  }

  const handler = async () => {
    const data = await result;
    if (!data.success) throw new Error(data.error);
    return ("data" in data ? data.data : undefined) as UnwrapResult<Awaited<T>>;
  };
  return handler();
}
