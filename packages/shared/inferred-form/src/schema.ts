import type { core } from "zod";
import * as z from "zod";

/** Structural constraint for objects passed to inferSchema / InferredSchema */
export type GenericFormShape = Record<string, { validator: core.$ZodType }>;

export type GenericSchema = z.ZodObject<z.ZodRawShape>;

type SchemaDefaultValues<Schema extends GenericSchema> = {
  [K in keyof Schema["shape"]]: Schema["shape"][K] extends z.ZodDefault<infer T>
    ? T
    : never;
};

export const inferSchemaDefaultValues = <Schema extends GenericSchema>(
  schema: Schema,
): SchemaDefaultValues<Schema> => {
  const values = Object.entries(schema.shape)
    .map(([key, value]) => {
      if (value instanceof z.ZodDefault) {
        return [key, value.unwrap()];
      }
      return [key, undefined];
    })
    .filter(([, value]) => value !== undefined);

  return Object.fromEntries(values);
};

export type InferredSchema<Form extends GenericFormShape> = z.ZodObject<{
  [K in keyof Form]: Form[K]["validator"];
}>;

export const inferSchema = <Form extends GenericFormShape>(
  form: Form,
): InferredSchema<Form> => {
  const shape = Object.fromEntries(
    Object.entries(form).map(([key, { validator }]) => [key, validator]),
  );

  return z.strictObject(shape) as InferredSchema<Form>;
};

export type ZodInfer<Schema extends z.ZodObject<z.ZodRawShape>> =
  z.infer<Schema>;
