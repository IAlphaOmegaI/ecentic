import * as React from "react";

/**
 * InferredForm — from @zenncore/web@0.0.0.
 */
export interface InferredFormProps {
  defaultValues?: Partial<
    z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"] }, {}>
  >;
  config: Form;
  extend?: (schema: InferredSchema<Form>) => Schema;
  transform?: (value: z.core.output<Schema>) => z.core.output<Schema>;
  children?: React.ReactNode;
  className?: string;
  renderFields?: boolean;
  custom?: { error?: FieldError.Props["render"] };
  onSubmit?: (
    data: z.core.$InferObjectOutput<
      { [K in keyof Form]: Form[K]["validator"] },
      {}
    >,
    form: UseFormReturn<
      z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"] }, {}>
    >,
  ) => void;
  onBlur?: (
    event: FocusEvent<HTMLFormElement, Element>,
    form: UseFormReturn<
      z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"] }, {}>
    >,
  ) => void;
  onChange?: (
    data: z.core.$InferObjectOutput<
      { [K in keyof Form]: Form[K]["validator"] },
      {}
    >,
    form: UseFormReturn<
      z.core.$InferObjectOutput<{ [K in keyof Form]: Form[K]["validator"] }, {}>
    >,
  ) => void;
}

export declare const InferredForm: React.ComponentType<InferredFormProps>;
