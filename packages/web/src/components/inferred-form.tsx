"use client";

import {
  applyFormOptions as applyFormOptionsPrimitive,
  type CreateCustomField,
  type FormEntries,
  type FormFromOptions,
  field as fieldPrimitive,
  type GenericForm,
  type GenericSchema,
  type GenericShape as GenericShapePrimitive,
  type InferredFieldConfig as InferredFieldConfigPrimitive,
  type InferredFormOptions as InferredFormOptionsPrimitive,
  type InferredProps as InferredPropsPrimitive,
  type InferredSchema,
  type InferredValidator as InferredValidatorPrimitive,
  type InterfaceValue,
  reduceValidator,
  type UseInferredFormParams,
  useInferredForm,
} from "@zenncore/inferred-form";
import { cn, type ValueOf } from "@zenncore/utils";
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
  PhoneField,
  PhoneFieldCountryCombobox,
  PhoneFieldInput,
} from "./phone-field";
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
        z.ZodEnum<any>,
        {
          placeholder?: string;
          items?: Select.Props<unknown>["items"];
        } & SelectTrigger.Props
      >
    | InterfaceValue<
        z.ZodArray<z.ZodEnum<any>>,
        {
          multiple: true;
          placeholder?: string;
          items?: Select.Props<unknown>["items"];
        } & SelectTrigger.Props
      >;
  phone: InterfaceValue<z.ZodString, PhoneField.Props>;
  file:
    | InterfaceValue<z.ZodFile, Extract<FileUpload.Props, { mode: "single" }>>
    | InterfaceValue<
        z.ZodArray<z.ZodFile>,
        Extract<FileUpload.Props, { mode: "multiple" }>
      >;
  checkbox: InterfaceValue<z.ZodBoolean, Checkbox.Props>;
};

export type { CreateCustomField, FormEntries, GenericForm, InferredSchema };

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

type SomeField = ValueOf<{
  [K in GenericShape]: InferredFieldConfig<
    K,
    InferredValidator<K>,
    InferredProps<K, InferredValidator<K>>
  >;
}>;

export type InferredFormFieldProps<Field extends SomeField> = {
  className?: string | ((state: never) => string);
  name: string;
} & Field;

export const InferredFormField = <Field extends SomeField>(
  props: InferredFormFieldProps<Field>,
): ReactNode => {
  const { className } = props;
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

        // const { shape, validator, ...controlProps } = props;

        const element = (() => {
          switch (props.shape) {
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
              return <Checkbox {...field} {...props} />;
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

                if (isEnum) {
                  return multiple
                    ? reduceValidator(
                        (
                          reduceValidator(
                            props.validator,
                          ) as z.ZodArray<z.ZodEnum>
                        ).element,
                      ).options
                    : reduceValidator(props.validator as z.ZodEnum).options;
                }

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
                  inputRef={field.ref}
                  items={props.items}
                  multiple={multiple}
                  onValueChange={field.onValueChange}
                >
                  <SelectTrigger
                    {...props}
                    className="group-data-invalid:border-error"
                    classList={props.classList?.control}
                  >
                    <SelectValue>
                      {(value) =>
                        multiple
                          ? value
                              ?.map(
                                (value: string) =>
                                  options.find(
                                    (option) => option.value === value,
                                  )?.label,
                              )
                              .join(", ")
                          : options.find((option) => option.value === value)
                              ?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectPopup>
                      {options.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </SelectPositioner>
                </Select>
              );
            }
            case "phone": {
              return (
                <PhoneField {...field} {...props}>
                  <PhoneFieldCountryCombobox />
                  <PhoneFieldInput className="group-data-invalid:border-error" />
                </PhoneField>
              );
            }

            case "custom": {
              const { Component, ...rest } = props;

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
          }
        })();

        return (
          <Field className={cn("group", props.classList?.field)}>
            <FieldLabel
              className={cn(
                "font-semibold data-invalid:text-error",
                props.classList?.label,
              )}
            >
              {props.label ?? props.name}
            </FieldLabel>
            {element}
            <FieldError className={props.classList?.error} />
            <FieldDescription
              className={cn(
                "text-foreground-dimmed",
                props.classList?.description,
              )}
            >
              {props.description}
            </FieldDescription>
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
}: InferredForm.Props<Form, Schema>): ReactNode => {
  const form = useInferredForm({
    config,
    defaultValues,
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
      onSubmit={form.handleSubmit(() => onSubmit?.(form.getValues()))}
      form={form}
    >
      {Object.entries(config).map(([key, field]) => (
        <InferredFormField key={key} name={key} {...(field as SomeField)} />
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
    onSubmit?: (data: FormEntries<Form>) => void;
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
