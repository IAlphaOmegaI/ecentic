import type { ClassList } from "@zenncore/utils";
import type { EmptyObject, Prettify } from "@zenncore/utils/types";
import type { ComponentType } from "react";
import type * as z from "zod";
import type { GenericInterface } from "./interface";
import type { GenericProps, InferredProps, RefinedProps } from "./props";
import type { GenericShape } from "./shape";
import type {
  GenericValidator,
  InferredValidator,
  InferredValueValidator,
  ReducedValidator,
} from "./validator";

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

export type CreateCustomField<
  Value,
  Props extends RefinedProps<Value>,
  Component extends ComponentType<Props>,
> = {
  Shape: "custom";
  Validator: InferredValueValidator<NonNullable<Props["value"]>>;
  Props: Props & {
    Component: Component;
  };
};

// biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
type GenericValue = any;

export type CustomField = CreateCustomField<
  GenericValue,
  RefinedProps<GenericValue>,
  ComponentType<RefinedProps<GenericValue>>
>;
