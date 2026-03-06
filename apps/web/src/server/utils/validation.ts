import type { z } from "zod";

export const $OmitSystemFields = <
  Shape extends z.ZodRawShape,
  AdditionalFields extends keyof Shape,
>(
  validator: z.ZodObject<Shape>,
  additions: AdditionalFields[] = [],
): z.ZodObject<
  Omit<Shape, "id" | "createdAt" | "updatedAt" | AdditionalFields>
> => {
  return validator.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    ...additions.reduce(
      (acc, field) => {
        acc[field] = true;
        return acc;
      },
      {} as Record<AdditionalFields, boolean>,
    ),
  }) as z.ZodObject<
    Omit<Shape, "id" | "createdAt" | "updatedAt" | AdditionalFields>
  >;
};
