"use client";

import {
  field,
  type RefinedProps,
} from "@zenncore/web/components/inferred-form";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import type { getMessages } from "next-intl/server";
import type { FocusEventHandler, Ref } from "react";
import { z } from "zod";
import {
  aiChannels,
  businessTypes,
  catalogSizes,
  partnerTracks,
  websiteSchema,
} from "@/lib/marketing-lead";

export type LeadCopy = Awaited<
  ReturnType<typeof getMessages>
>["enterpriseLead"];

const LongResponse = ({
  value,
  onValueChange,
  name,
  label,
  placeholder,
  onBlur,
  ref,
}: RefinedProps<string> & {
  name?: string;
  label?: string;
  placeholder?: string;
  onBlur?: FocusEventHandler<HTMLTextAreaElement>;
  ref?: Ref<HTMLTextAreaElement>;
}) => (
  <Textarea value={value} onValueChange={onValueChange}>
    <TextareaInput
      ref={ref}
      name={name}
      aria-label={label}
      placeholder={placeholder}
      onBlur={onBlur}
      rows={5}
      maxLength={3000}
    />
  </Textarea>
);

export const createLeadFields = (copy: LeadCopy) => {
  const required = (maximum: number) =>
    z
      .string({ error: copy.validation.required })
      .trim()
      .min(1, copy.validation.required)
      .max(maximum, copy.validation.tooLong);
  const websiteValidator: z.ZodString = required(500).refine(
    (value) => websiteSchema.safeParse(value).success,
    copy.validation.website,
  );
  return {
    name: field({
      shape: "text",
      validator: required(120),
      ...copy.fields.name,
    }),
    email: field({
      shape: "text",
      type: "email",
      validator: z
        .string({ error: copy.validation.email })
        .trim()
        .email(copy.validation.email)
        .max(254, copy.validation.tooLong),
      ...copy.fields.email,
    }),
    company: field({
      shape: "text",
      validator: required(180),
      ...copy.fields.company,
    }),
    website: field({
      shape: "text",
      validator: websiteValidator,
      ...copy.fields.website,
    }),
    businessType: field({
      shape: "select",
      validator: z.enum(businessTypes, { error: copy.validation.choice }),
      ...copy.fields.businessType,
      items: copy.options.businessType,
    }),
    catalogSize: field({
      shape: "select",
      validator: z.enum(catalogSizes, { error: copy.validation.choice }),
      ...copy.fields.catalogSize,
      items: copy.options.catalogSize,
    }),
    markets: field({
      shape: "text",
      validator: required(500),
      ...copy.fields.markets,
      classList: { field: "md:col-span-2" },
    }),
    goals: field({
      shape: "custom",
      Component: LongResponse,
      validator: required(3000),
      ...copy.fields.goals,
      classList: { field: "md:col-span-2" },
    }),
    aiChannel: field({
      shape: "select",
      validator: z.enum(aiChannels, { error: copy.validation.choice }),
      ...copy.fields.aiChannel,
      items: copy.options.aiChannel,
      classList: { field: "md:col-span-2" },
    }),
    tool: field({
      shape: "text",
      validator: required(180),
      ...copy.fields.tool,
    }),
    track: field({
      shape: "select",
      validator: z.enum(partnerTracks, { error: copy.validation.choice }),
      ...copy.fields.track,
      items: copy.options.track,
    }),
    stores: field({
      shape: "text",
      validator: required(120),
      ...copy.fields.stores,
    }),
    note: field({
      shape: "custom",
      Component: LongResponse,
      validator: z
        .string({ error: copy.validation.required })
        .trim()
        .max(3000, copy.validation.tooLong),
      ...copy.fields.note,
      classList: { field: "md:col-span-2" },
    }),
  };
};
