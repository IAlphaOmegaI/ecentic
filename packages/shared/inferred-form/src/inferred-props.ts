import type { IsUnion } from "@zenncore/utils/types";
import type { CompleteInterface, GenericInterface } from "./interface";
import type { GenericShape } from "./shape";
import type { InferredValidator, ReducedValidator } from "./validator";

export type { GenericProps, RefinedProps } from "./props";

export type InferredProps<
  Interface extends GenericInterface,
  Shape extends GenericShape<Interface>,
  Validator extends InferredValidator<Interface, Shape>,
> =
  IsUnion<CompleteInterface<Interface>[Shape]> extends true
    ? Extract<
        CompleteInterface<Interface>[Shape],
        { validator: ReducedValidator<Validator> }
      >["props"]
    : CompleteInterface<Interface>[Shape]["props"];
