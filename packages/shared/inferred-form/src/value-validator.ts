import type { EmptyObject } from "@zenncore/utils/types";
import type { z } from "zod";

export type InferredValueValidator<T> = T extends string
  ? z.ZodString
  : T extends number
    ? z.ZodNumber
    : T extends boolean
      ? z.ZodBoolean
      : T extends null
        ? z.ZodNull
        : T extends undefined
          ? z.ZodUndefined
          : T extends Array<infer I>
            ? z.ZodArray<InferredValueValidator<I>>
            : T extends EmptyObject
              ? z.ZodObject<{
                  [K in keyof T]: InferredValueValidator<T[K]>;
                }>
              : z.ZodNever;
