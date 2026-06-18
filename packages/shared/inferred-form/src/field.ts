import type { ClassList } from "@zenncore/utils";
import type { EmptyObject, Prettify } from "@zenncore/utils/types";
import type * as z from "zod";
import type { GenericProps, InferredProps } from "./inferred-props";
import type { GenericInterface } from "./interface";
import type { GenericShape } from "./shape";
import type {
  GenericValidator,
  InferredValidator,
  ReducedValidator,
} from "./validator";

export type { CreateCustomField, CustomField } from "./custom-field";

export type GenericFieldConfig = InferredFieldConfig<
  GenericInterface,
  GenericShape<GenericInterface>,
  GenericValidator,
  GenericProps
>;

export type InferredFieldConfig<
  Interface extends GenericInterface,
  Shape extends GenericShape<Interface>,
  Validator extends InferredValidator<Interface, Shape>,
  Props extends InferredProps<Interface, Shape, Validator>,
> = Omit<Props, "onValueChange" | "onBlur" | "classList" | "children"> & {
  shape: Shape;

  validator: ReducedValidator<Validator>;
  defaultValue?: z.infer<Validator> | undefined;

  placeholder?: string;
  label?: string;
  description?: string;

  classList?: Prettify<
    ClassList<"root" | "label" | "description" | "error" | "field"> &
      ("classList" extends keyof Props
        ? { control?: Props["classList"] }
        : EmptyObject)
  >;
};

export const field = <
  Interface extends GenericInterface,
  Shape extends GenericShape<Interface>,
  Validator extends InferredValidator<Interface, Shape>,
  Props extends InferredProps<Interface, Shape, Validator> = InferredProps<
    Interface,
    Shape,
    Validator
  >,
>(
  config: InferredFieldConfig<Interface, Shape, Validator, Props>,
): InferredFieldConfig<Interface, Shape, Validator, Props> => config;
