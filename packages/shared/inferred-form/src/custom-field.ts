import type { ComponentType } from "react";
import type { z } from "zod";
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

// A generic custom field accepts any schema. Inferring a recursive validator
// from `any` here makes consumers of the complete field union recurse forever.
export type CustomField = {
  Shape: "custom";
  Validator: z.ZodType;
  Props: RefinedProps<GenericValue> & {
    // Creation checks the concrete props through CreateCustomField. The
    // generic renderer also carries custom components with required extras.
    Component: ComponentType<GenericValue>;
  };
};
