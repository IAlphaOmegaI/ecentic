import { type core, z } from "zod";
import type { CompleteInterface, GenericInterface } from "./interface";

export type { InferredValueValidator } from "./value-validator";

export type GenericValidator = core.$ZodType;

export type InferredValidator<
  Interface extends GenericInterface,
  Shape extends keyof CompleteInterface<Interface>,
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
