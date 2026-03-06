"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import { Form as FormPrimitive } from "@base-ui/react/form";
import {
  type FieldError as FieldErrorType,
  getErrorMessage,
} from "@zenncore/utils";
import { createContext } from "@zenncore/utils/hooks";
import type { ComponentProps, JSX } from "react";
import {
  Controller,
  type ControllerProps,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type UseFormGetFieldState,
  type UseFormReturn,
  useFormContext,
  useFormState,
} from "react-hook-form";
import { createClassName } from "../utils/helpers/class-name";

type Errors = NonNullable<Form.Props<FieldValues>["errors"]>;

export const getFormErrors = (errors: FieldErrors): Errors | undefined => {
  const hasErrors = Object.keys(errors).length > 0;

  const formErrors = hasErrors
    ? Object.entries<FieldErrorType>(errors).reduce(
        (accumulator, [key, fieldError]) => {
          const message = getErrorMessage(fieldError);

          if (message) accumulator[key] = message;

          return accumulator;
        },
        {} as Errors,
      )
    : undefined;

  return formErrors;
};

type FieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = ReturnType<UseFormGetFieldState<TFieldValues>> & {
  name?: TName;
};

const [FieldContext, useField] = createContext<FieldContextValue>({
  error:
    "zenncore: FieldContext is missing. Field components must be placed within a FieldController.",
});

export const Form = <T extends FieldValues>({
  form,
  className,
  ...props
}: Form.Props<T>): JSX.Element => {
  return (
    <FormProvider {...form}>
      <FormPrimitive
        className={createClassName("w-full space-y-4", className)}
        {...props}
      />
    </FormProvider>
  );
};
export namespace Form {
  export type Props<T extends FieldValues> = {
    form: UseFormReturn<T>;
  } & ComponentProps<typeof FormPrimitive>;
  export type State = FormPrimitive.State;
  export type SubmitEventDetails = FormPrimitive.SubmitEventDetails;
  export type SubmitEventReason = FormPrimitive.SubmitEventReason;
  export type ValidationMode = FormPrimitive.ValidationMode;
  export type Values = FormPrimitive.Values;
}

export const FieldController = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: FieldController.Props<TFieldValues, TName>): JSX.Element => {
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: props.name });

  if (!props.name) throw new Error("FieldController requires a name prop.");

  const fieldState = getFieldState(props.name, formState);

  return (
    <FieldContext value={{ name: props.name, ...fieldState }}>
      <Controller {...props} />
    </FieldContext>
  );
};
export namespace FieldController {
  export type Props<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  > = ControllerProps<TFieldValues, TName>;
}

export const Field = ({ className, ...props }: Field.Props): JSX.Element => {
  const { name, invalid, isTouched, isDirty } = useField();

  return (
    <FieldPrimitive.Root
      name={name}
      invalid={invalid}
      touched={isTouched}
      dirty={isDirty}
      className={createClassName("flex flex-col gap-2", className)}
      {...props}
    />
  );
};
export namespace Field {
  export type Props = ComponentProps<typeof FieldPrimitive.Root>;
  export type State = FieldPrimitive.Root.State;
}

export const FieldLabel = ({
  className,
  ...props
}: FieldLabel.Props): JSX.Element => {
  return (
    <FieldPrimitive.Label
      className={createClassName(
        "font-medium text-gray-900 text-sm",
        className,
      )}
      {...props}
    />
  );
};
export namespace FieldLabel {
  export type Props = ComponentProps<typeof FieldPrimitive.Label>;
  export type State = FieldPrimitive.Label.State;
}

export const FieldControl = ({
  className,
  ...props
}: FieldControl.Props): JSX.Element => {
  return (
    <FieldPrimitive.Control
      className={createClassName(
        "h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline focus:outline-blue-800 focus:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
};
export namespace FieldControl {
  export type Props = ComponentProps<typeof FieldPrimitive.Control>;
  export type State = FieldPrimitive.Control.State;
  export type ChangeEventDetails = FieldPrimitive.Control.ChangeEventDetails;
  export type ChangeEventReason = FieldPrimitive.Control.ChangeEventReason;
}

export const FieldDescription = ({
  className,
  ...props
}: FieldDescription.Props): JSX.Element => {
  return (
    <FieldPrimitive.Description
      className={createClassName("text-foreground-dimmed text-sm", className)}
      {...props}
    />
  );
};
export namespace FieldDescription {
  export type Props = ComponentProps<typeof FieldPrimitive.Description>;
  export type State = FieldPrimitive.Description.State;
}

export const FieldError = ({
  children,
  className,
  ...props
}: FieldError.Props): JSX.Element => {
  const { error } = useField();

  return (
    <FieldPrimitive.Error
      match={Boolean(error)}
      className={createClassName("font-medium text-error text-sm", className)}
      {...props}
    >
      {children ?? getErrorMessage(error)}
    </FieldPrimitive.Error>
  );
};
export namespace FieldError {
  export type Props = ComponentProps<typeof FieldPrimitive.Error>;
  export type State = FieldPrimitive.Error.State;
}

export const FieldValidity: typeof FieldPrimitive.Validity =
  FieldPrimitive.Validity;
export namespace FieldValidity {
  export type Props = ComponentProps<typeof FieldPrimitive.Validity>;
  export type State = FieldPrimitive.Validity.State;
}
