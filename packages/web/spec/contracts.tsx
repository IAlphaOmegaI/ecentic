import type { CreateCustomField, RefinedProps } from "@zenncore/inferred-form";
import { z } from "zod";
import {
  field,
  type GenericField,
  InferredForm,
  InferredFormField,
} from "../src/components/inferred-form";

// Compile real consumers of the public field union: the generic custom-field
// validator must not recurse while checking an ordinary built-in field.
const otp = field({ shape: "otp", validator: z.string(), maxLength: 6 });
const descriptor: GenericField = otp;
const control = <InferredFormField name="code" {...descriptor} />;
const custom: RefinedProps<number> = {
  value: 0,
  onValueChange: () => undefined,
};
type PromptProps = RefinedProps<string> & { hint: string };
const Prompt = ({ hint }: PromptProps) => <span>{hint}</span>;
type PromptField = CreateCustomField<string, PromptProps, typeof Prompt>;
const prompt = field<
  PromptField["Shape"],
  PromptField["Validator"],
  PromptField["Props"]
>({
  shape: "custom",
  validator: z.string(),
  Component: Prompt,
  hint: "Search",
});
const promptControl = <InferredFormField name="prompt" {...prompt} />;

const config = {
  name: field({
    shape: "text",
    validator: z.string(),
    label: ({ name, isFieldRequired }) => (
      <span>{`${name}:${isFieldRequired}`}</span>
    ),
  }),
};
const form = (
  <InferredForm
    config={config}
    extend={(schema) => schema.extend({ extra: z.string() })}
    onChange={(values, controller) => {
      const name: string = values.name;
      const extra: string = values.extra;
      controller.setValue("extra", extra);
      void name;
    }}
  />
);

void [control, promptControl, custom, form];
