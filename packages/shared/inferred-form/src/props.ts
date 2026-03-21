import type { IsUnion } from "@zenncore/utils/types";
import type { CompleteInterface, GenericInterface } from "./interface";
import type { GenericShape } from "./shape";
import type { InferredValidator, ReducedValidator } from "./validator";

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

export type GenericProps = {
  value?: never;
  onValueChange?: (value: never) => void;
  defaultValue?: unknown;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
};

export type RefinedProps<Value, Ref extends HTMLElement = HTMLInputElement> = {
  value?: Value;
  onValueChange?: (value: Value) => void;
  defaultValue?: Value;
  onBlur?: (event: React.FocusEvent<Ref>) => void;
  ref?: React.RefObject<Ref>;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
};
