"use client";

import {
  type Context,
  createContext as createContextPrimitive,
  use,
} from "react";

type CreateContextParams<T> = {
  defaultValue?: T;
} & (
  | {
      error: string;
      name?: string;
    }
  | {
      error?: never;
      name: string;
    }
);

export const createContext = <T>({
  name,
  defaultValue,
  error,
}: CreateContextParams<T>): [Context<T | undefined>, () => T] => {
  const context = createContextPrimitive<T | undefined>(defaultValue);

  const useContext = () => {
    const contextValue = use(context);

    if (contextValue === undefined) {
      throw new Error(
        error ??
          `zenncore: ${name}Context is missing. ${name} components must be placed within <${name}>.`,
      );
    }

    return contextValue;
  };

  return [context, useContext] as const;
};
