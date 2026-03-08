import type { ClassList, ValueOf } from "@zenncore/utils";
import type { EmptyObject, Prettify } from "@zenncore/utils/types";
import type { ComponentType, ReactNode } from "react";
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
> = Omit<
  Props,
  "onValueChange" | "onBlur" | "classList" | "children" | "value"
> & {
  shape: Shape;

  validator: ReducedValidator<Validator>;
  defaultValue?: z.infer<Validator> | undefined;

  placeholder?: string;
  label?:
    | string
    | ((props: { isFieldRequired: boolean; name: string }) => ReactNode);
  description?:
    | string
    | ((props: { isFieldRequired: boolean; name: string }) => ReactNode);

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

export type GenericField<Interface extends GenericInterface> = ValueOf<{
  [K in GenericShape<Interface>]: InferredFieldConfig<
    Interface,
    K,
    InferredValidator<Interface, K>,
    InferredProps<Interface, K, InferredValidator<Interface, K>>
  >;
}>;
