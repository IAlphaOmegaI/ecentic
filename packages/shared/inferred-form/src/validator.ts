import type { EmptyObject } from "@zenncore/utils/types";
import { type core, z } from "zod";
import type { CompleteInterface, GenericInterface } from "./interface";
import type { GenericShape } from "./shape";

export type GenericValidator = core.$ZodType;

export type InferredValidator<
  Interface extends GenericInterface,
  Shape extends GenericShape<Interface>,
> = CompleteInterface<Interface>[Shape]["validator"];

export type ReducedValidator<T extends GenericValidator> =
  T extends z.ZodDefault<infer U extends GenericValidator>
    ? ReducedValidator<U>
    : T extends z.ZodOptional<infer U extends GenericValidator>
      ? ReducedValidator<U>
      : T extends z.ZodNullable<infer U extends GenericValidator>
        ? ReducedValidator<U>
        : T extends z.ZodReadonly<infer U extends GenericValidator>
          ? ReducedValidator<U>
          : T;

export const reduceValidator = <T extends GenericValidator>(
  validator: T,
): ReducedValidator<T> => {
  switch (true) {
    case validator instanceof z.ZodOptional:
    case validator instanceof z.ZodDefault:
      return reduceValidator(validator.def.innerType) as ReducedValidator<T>;
    case validator instanceof z.ZodNullable:
      return reduceValidator(validator.def.innerType) as ReducedValidator<T>;
    default:
      return validator as ReducedValidator<T>;
  }
};

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
