import type { ComponentType } from "react";
import type { RefinedProps } from "./props";
import type { InferredValueValidator } from "./value-validator";

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
