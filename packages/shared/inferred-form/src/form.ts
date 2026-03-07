import type { core, z } from "zod";
import type {
  CustomField,
  GenericFieldConfig,
  InferredFieldConfig,
} from "./field";
import type { GenericInterface } from "./interface";
import type { InferredProps } from "./props";
import type { GenericSchema } from "./schema";
import type { InferredValidatorShape } from "./shape";

export type GenericForm = Record<string, GenericFieldConfig>;

export type FormEntries<Form extends GenericForm> = z.infer<
  z.ZodObject<
    {
      [K in keyof Form]: Form[K]["validator"];
    },
    core.$strict
  >
>;

export type InferredFormOptions<
  Interface extends GenericInterface,
  Schema extends GenericSchema,
> = {
  [K in keyof Schema["shape"]]: Omit<
    // @ts-expect-error
    InferredFieldConfig<
      Interface,
      | InferredValidatorShape<Interface, Schema["shape"][K]>
      | CustomField["Shape"],
      // @ts-expect-error
      Schema["shape"][K] | CustomField["Validator"],
      | InferredProps<
          Interface,
          InferredValidatorShape<Interface, Schema["shape"][K]>,
          Schema["shape"][K]
        >
      | CustomField["Props"]
    >,
    "validator"
  >;
};

export type FormFromOptions<
  Interface extends GenericInterface,
  Schema extends GenericSchema,
  Options extends InferredFormOptions<Interface, Schema>,
> = {
  [K in keyof Schema["shape"]]: Options[K] & {
    validator: Schema["shape"][K];
  };
};

export const applyFormOptions = <
  Interface extends GenericInterface,
  Schema extends GenericSchema,
>(
  schema: Schema,
  options: InferredFormOptions<Interface, Schema>,
) => {
  return Object.fromEntries(
    Object.entries(schema.shape).map(([key, validator]) => [
      key,
      { validator, ...options[key] },
    ]),
  ) as unknown as FormFromOptions<
    Interface,
    Schema,
    InferredFormOptions<Interface, Schema>
  >;
};

type FormDefaultValues<Form extends GenericForm> = {
  [K in keyof Form]: Form[K]["defaultValue"];
};

export const inferFormDefaultValues = <Form extends GenericForm>(
  config: Form,
): FormDefaultValues<Form> => {
  return Object.fromEntries(
    Object.entries(config).map(([key, { defaultValue }]) => [
      key,
      defaultValue,
    ]),
  ) as FormDefaultValues<Form>;
};
