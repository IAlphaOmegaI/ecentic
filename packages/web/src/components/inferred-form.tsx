"use client";

import {
  applyFormOptions as applyFormOptionsPrimitive,
  type CreateCustomField,
  type FormEntries,
  type FormFromOptions,
  field as fieldPrimitive,
  type GenericField as GenericFieldPrimitive,
  type GenericForm,
  type GenericSchema,
  type GenericShape as GenericShapePrimitive,
  type InferredFieldConfig as InferredFieldConfigPrimitive,
  type InferredFormOptions as InferredFormOptionsPrimitive,
  type InferredProps as InferredPropsPrimitive,
  type InferredSchema,
  type InferredValidator as InferredValidatorPrimitive,
  type InterfaceValue,
  type RefinedProps,
  reduceValidator,
  type UseInferredFormParams,
  useInferredForm,
} from "@zenncore/inferred-form";
import { cn } from "@zenncore/utils";
import { type FocusEvent, type ReactNode, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "./checkbox";
import { FileUpload, FileUploadInput, FileUploadPreview } from "./file-upload";
import {
  Field,
  FieldController,
  FieldDescription,
  FieldError,
  FieldLabel,
  Form,
} from "./form";
import { NumberField } from "./number-field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./otp-input";
import { Radio, RadioGroup } from "./radio";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "./select";
import { TextField, TextFieldInput, TextFieldMaskToggle } from "./text-field";

type Interface = {
  text: InterfaceValue<z.ZodString, TextField.Props>;
  number: InterfaceValue<z.ZodNumber, NumberField.Props>;
  select:
    | InterfaceValue<
        // biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
        z.ZodLiteral<any>,
        {
          placeholder?: string;
          items?: Select.Props<unknown>["items"];
        } & SelectTrigger.Props
      >
    | InterfaceValue<
        // biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
        z.ZodArray<z.ZodLiteral<any>>,
        {
          multiple: true;
          placeholder?: string;
          items?: Select.Props<unknown>["items"];
        } & SelectTrigger.Props
      >
    | InterfaceValue<
        // biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
        z.ZodEnum<any>,
        {
          placeholder?: string;
          items?: Select.Props<unknown>["items"];
        } & SelectTrigger.Props
      >
    | InterfaceValue<
        // biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
        z.ZodArray<z.ZodEnum<any>>,
        {
          multiple: true;
          placeholder?: string;
          items?: Select.Props<unknown>["items"];
        } & SelectTrigger.Props
      >;
  radio:
    | InterfaceValue<
        // biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
        z.ZodLiteral<any>,
        {
          items?: Array<{ label: string; value: string }>;
          classList?: Radio.Props["classList"];
        } & RadioGroup.Props
      >
    | InterfaceValue<
        // biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
        z.ZodEnum<any>,
        {
          items?: Array<{ label: string; value: string }>;
          classList?: Radio.Props["classList"];
        } & RadioGroup.Props
      >;
  file:
    | InterfaceValue<z.ZodFile, Extract<FileUpload.Props, { mode: "single" }>>
    | InterfaceValue<
        z.ZodArray<z.ZodFile>,
        Extract<FileUpload.Props, { mode: "multiple" }>
      >;
  checkbox: InterfaceValue<z.ZodBoolean, Checkbox.Props>;
  otp: InterfaceValue<z.ZodString, InputOTP.Props>;
};

export type {
  CreateCustomField,
  FormEntries,
  GenericForm,
  InferredSchema,
  RefinedProps,
};

export type InferredFieldConfig<
  Shape extends GenericShape,
  Validator extends InferredValidator<Shape>,
  Props extends InferredProps<Shape, Validator>,
> = InferredFieldConfigPrimitive<Interface, Shape, Validator, Props>;

export type InferredProps<
  Shape extends GenericShape,
  Validator extends InferredValidator<Shape>,
> = InferredPropsPrimitive<Interface, Shape, Validator>;

export type InferredFormOptions<Schema extends GenericSchema> =
  InferredFormOptionsPrimitive<Interface, Schema>;

export const applyFormOptions = <Schema extends GenericSchema>(
  schema: Schema,
  options: InferredFormOptions<Schema>,
): FormFromOptions<Interface, Schema, InferredFormOptions<Schema>> => {
  return applyFormOptionsPrimitive<Interface, Schema>(schema, options);
};

export type GenericShape = GenericShapePrimitive<Interface>;

export type GenericField = GenericFieldPrimitive<Interface>;

export type InferredFormFieldProps<Field extends GenericField> = Field & {
  className?: string | ((state: never) => string);
  name: string;
  custom?: {
    error?: FieldError.Props["render"];
  };
};

export const InferredFormField = <Field extends GenericField>(
  // @ts-expect-error - InferredFormFieldProps is a generic type that is used to infer the props for the field
  props: InferredFormFieldProps<Field>,
): ReactNode => {
  const { className, name, validator } = props;

  const isFieldRequired =
    validator &&
    (() => {
      if (validator.safeParse(undefined).success) return false;
      switch (validator.type) {
        case "string":
          return !validator.safeParse("").success;
        case "array":
          return !validator.safeParse([]).success;
        case "object":
          return !validator.safeParse({}).success;
        default:
          return true;
      }
    })();

  return (
    <FieldController
      name={props.name}
      render={({ field: inherit }) => {
        const field = {
          onValueChange: inherit.onChange,
          onBlur: inherit.onBlur,
          value: inherit.value || null,
          disabled: inherit.disabled,
          ref: inherit.ref,
          name: inherit.name,
        };

        const element = (() => {
          switch (props.shape) {
            case "otp": {
              return (
                <InputOTP {...field} {...props}>
                  <InputOTPGroup>
                    {Array.from({ length: props.maxLength }).map((_, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: needed to handle the key
                      <InputOTPSlot key={`otp-slot-${index}`} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              );
            }
            case "text": {
              return (
                <TextField
                  {...field}
                  {...props}
                  className={cn(
                    "border border-accent-foreground group-data-invalid:border-error group-data-invalid:placeholder:text-error",
                    className,
                  )}
                >
                  <TextFieldInput />
                  {props.type === "password" && <TextFieldMaskToggle />}
                </TextField>
              );
            }
            case "checkbox": {
              //set checked as value
              return (
                <Checkbox
                  {...field}
                  {...props}
                  checked={field?.value || false}
                />
              );
            }
            case "number": {
              return <NumberField {...field} {...props} />;
            }
            case "select": {
              const multiple =
                "multiple" in props ||
                reduceValidator(props.validator) instanceof z.ZodArray;

              const values = (() => {
                const isEnum = multiple
                  ? reduceValidator(
                      (
                        reduceValidator(
                          props.validator,
                        ) as z.ZodArray<z.ZodEnum>
                      ).element,
                    ) instanceof z.ZodEnum
                  : reduceValidator(props.validator) instanceof z.ZodEnum;

                if (isEnum)
                  return multiple
                    ? reduceValidator(
                        (
                          reduceValidator(
                            props.validator,
                          ) as z.ZodArray<z.ZodEnum>
                        ).element,
                      ).options
                    : reduceValidator(props.validator as z.ZodEnum).options;

                return multiple
                  ? Array.from(
                      reduceValidator(
                        reduceValidator(
                          props.validator,
                        ) as z.ZodArray<z.ZodLiteral>,
                      ).element.values,
                    )
                  : Array.from(
                      reduceValidator(props.validator as z.ZodLiteral).values,
                    );
              })();

              const fallback = values.map((option) => ({
                label: option?.toString(),
                value: option,
              }));

              const normalizeItems = (
                items: Select.Props<unknown>["items"],
              ) => {
                return items
                  ? Array.isArray(items)
                    ? items
                    : Object.entries(items).map(([value, label]) => ({
                        label,
                        value,
                      }))
                  : fallback;
              };
              const options = normalizeItems(props.items);

              return (
                <Select
                  value={field.value}
                  onValueChange={field.onValueChange}
                  inputRef={field.ref}
                  items={props.items}
                  multiple={multiple}
                >
                  <SelectTrigger
                    {...props}
                    classList={props.classList?.control}
                    className={"group-data-invalid:border-error"}
                  >
                    <SelectValue>
                      {(value) => (
                        <div className="max-w-[15rem] overflow-x-auto overflow-y-hidden">
                          <div className="whitespace-nowrap">
                            {multiple
                              ? value
                                  ?.map(
                                    (value: string) =>
                                      options.find(
                                        (option) => option.value === value,
                                      )?.label,
                                  )
                                  .join(", ")
                              : options.find((option) => option.value === value)
                                  ?.label}
                          </div>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectPopup>
                      {options.map(({ value, label }) => (
                        <SelectItem
                          key={value}
                          value={value}
                          classList={props.classList?.control?.selectItem}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </SelectPositioner>
                </Select>
              );
            }

            case "radio": {
              // const _values = (() => {
              //   const isEnum =
              //     reduceValidator(props.validator) instanceof z.ZodEnum;

              //   if (isEnum)
              //     return reduceValidator(props.validator as z.ZodEnum).options;

              //   return Array.from(
              //     reduceValidator(props.validator as z.ZodLiteral).values,
              //   );
              // })();

              return (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onValueChange}
                  disabled={field.disabled}
                  {...props}
                >
                  {props.items?.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-3">
                      <Radio
                        value={value}
                        classList={props.classList}
                        id={name}
                      />
                      {/** biome-ignore lint/a11y/useKeyWithClickEvents: needed to handle the click event */}
                      <label
                        className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        onClick={() => field.onValueChange?.(value)}
                        htmlFor={name}
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              );
            }

            case "custom": {
              const { Component, ...rest } = props;
              // @ts-expect-error - Component is a custom component that is used to render the field
              return <Component {...rest} {...field} />;
            }

            case "file": {
              return (
                <FileUpload {...field} {...props}>
                  <FileUploadInput
                    classList={{ input: "group-data-invalid:border-error" }}
                  />
                  <FileUploadPreview />
                </FileUpload>
              );
            }

            // case "datetime": {
            //   return <DateTimePicker {...field} {...props} />;
            // }
          }
        })();

        return (
          <Field className={cn("group", props.classList?.field)}>
            {props?.label &&
              (typeof props.label === "function" ? (
                props.label({ isFieldRequired, name })
              ) : (
                <FieldLabel
                  className={cn(
                    "data-invalid:text-error",
                    props.classList?.label,
                  )}
                >
                  {props.label}
                  {isFieldRequired && " *"}
                </FieldLabel>
              ))}
            {element}
            <FieldError
              className={props.classList?.error}
              render={props.custom?.error}
            />
            {typeof props.description === "function" ? (
              props.description({ isFieldRequired, name })
            ) : (
              <FieldDescription
                className={cn(
                  "text-foreground-dimmed",
                  props.classList?.description,
                )}
              >
                {props.description}
              </FieldDescription>
            )}
          </Field>
        );
      }}
    />
  );
};

export const InferredForm = <
  Form extends GenericForm,
  Schema extends InferredSchema<Form> = InferredSchema<Form>,
>({
  children,
  config,
  defaultValues,
  className,
  onBlur,
  onSubmit,
  onChange,
  renderFields = true,
  custom,
  extend,
}: InferredForm.Props<Form, Schema>): ReactNode => {
  const form = useInferredForm({
    config,
    defaultValues,
    extend,
  });

  useEffect(() => {
    const { unsubscribe } = form.watch(() => {
      return onChange?.(form.getValues(), form);
    });

    return unsubscribe;
  }, [onChange, form]);

  return (
    <Form
      className={className}
      onBlur={(event) => onBlur?.(event, form)}
      onSubmit={form.handleSubmit(() => onSubmit?.(form.getValues(), form))}
      form={form}
    >
      {renderFields &&
        Object.entries(config).map(([key, field]) => (
          <InferredFormField
            key={key}
            custom={custom}
            name={key}
            {...(field as GenericField)}
          />
        ))}
      {children}
    </Form>
  );
};
export namespace InferredForm {
  export type Props<
    Form extends GenericForm,
    Schema extends InferredSchema<Form> = InferredSchema<Form>,
  > = UseInferredFormParams<Form, Schema> & {
    children?: ReactNode;
    className?: string;
    renderFields?: boolean;
    custom?: {
      error?: FieldError.Props["render"];
    };
    onSubmit?: (
      data: FormEntries<Form>,
      form: UseFormReturn<FormEntries<Form>>,
    ) => void;
    onBlur?: (
      event: FocusEvent<HTMLFormElement, Element>,
      form: UseFormReturn<FormEntries<Form>>,
    ) => void;
    onChange?: (
      data: FormEntries<Form>,
      form: UseFormReturn<FormEntries<Form>>,
    ) => void;
  };
}

export type InferredValidator<Shape extends GenericShape> =
  InferredValidatorPrimitive<Interface, Shape>;

export const field = <
  Shape extends GenericShape,
  Validator extends InferredValidator<Shape>,
  Props extends InferredProps<Shape, Validator>,
>(
  config: InferredFieldConfig<Shape, Validator, Props>,
): InferredFieldConfig<Shape, Validator, Props> => {
  return fieldPrimitive<Interface, Shape, Validator, Props>(config);
};
