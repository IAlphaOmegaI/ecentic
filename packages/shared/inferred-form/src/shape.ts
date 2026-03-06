import type { CompleteInterface, GenericInterface } from "./interface";
import type { GenericValidator, ReducedValidator } from "./validator";

export type GenericShape<Interface extends GenericInterface> =
  keyof CompleteInterface<Interface>;

export type InferredValidatorShape<
  Interface extends GenericInterface,
  Validator extends GenericValidator,
> = {
  [K in keyof CompleteInterface<Interface>]: ReducedValidator<Validator> extends Interface[K]["validator"]
    ? K
    : never;
}[keyof Interface];
