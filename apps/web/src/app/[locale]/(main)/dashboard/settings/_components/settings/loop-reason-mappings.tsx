"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  InferredForm,
  type InferredProps,
} from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import * as Signals from "@/server/app/integration/loop/signal-actions";
import type { ReturnSignals } from "@/server/app/integration/loop/signal-types";

const categories = [
  "fit",
  "color",
  "material",
  "dimensions",
  "compatibility",
  "contents",
  "not_as_described",
  "damaged",
  "shipping",
  "changed_mind",
  "other",
] as const;
type Category = (typeof categories)[number];
const categoryValidator = z.enum(categories);
const fixableValidator = z.boolean();
const categoryOf = (value: string): Category =>
  categories.find((category) => category === value) ?? "other";

const Mapping = ({
  store,
  mapping,
}: {
  store: string;
  mapping: ReturnSignals["mappings"][number];
}) => {
  const translate = useTranslations("dashboard.loop");
  const [saved, setSaved] = useState(false);
  const items = categories.map((category) => ({
    value: category,
    label: translate(`category.${category}`),
  }));
  const [error, setError] = useState(false);
  const [save, pending] = useAsyncAction(
    async (values: { category: Category; dataFixable: boolean }) => {
      setError(false);
      setSaved(false);
      const result = await Signals.overrideReason({
        store,
        mapping: mapping.id,
        ...values,
      });
      setError(!result.success);
      setSaved(result.success);
    },
  );
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <p className="wrap-anywhere font-medium text-sm">
        {mapping.parentReason ? `${mapping.parentReason} / ` : ""}
        {mapping.reason}
      </p>
      <p className="mt-2 text-foreground-dimmed text-xs">
        {translate(
          `source.${saved || mapping.source === "merchant" ? "merchant" : mapping.source === "model" ? "model" : "rule"}`,
        )}
      </p>
      <div className="mt-4 max-w-xl">
        <InferredForm
          config={{
            category: field<
              "select",
              typeof categoryValidator,
              InferredProps<"select", typeof categoryValidator>
            >({
              shape: "select",
              validator: categoryValidator,
              label: translate("categoryLabel"),
              defaultValue: categoryOf(mapping.category),
              items,
            }),
            dataFixable: field<
              "checkbox",
              typeof fixableValidator,
              InferredProps<"checkbox", typeof fixableValidator>
            >({
              shape: "checkbox",
              validator: fixableValidator,
              label: translate("fixable"),
              defaultValue: mapping.dataFixable,
            }),
          }}
          onSubmit={save}
        >
          <Button
            type="submit"
            variant="soft"
            color="neutral"
            disabled={pending}
          >
            {translate(pending ? "working" : "action.save")}
          </Button>
        </InferredForm>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-error text-sm">
          {translate("actionFailed")}
        </p>
      )}
    </div>
  );
};

export const LoopReasonMappings = ({ store }: { store: string }) => {
  const translate = useTranslations("dashboard.loop");
  const [open, setOpen] = useState(false);
  const [mappings, setMappings] = useState<ReturnSignals["mappings"] | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [load, pending] = useAsyncAction(async () => {
    setError(false);
    const result = await Signals.getSignals({ store });
    if (!result.success) {
      setError(true);
      return;
    }
    setMappings(result.data.mappings);
  });
  return (
    <Accordion
      className="min-w-0 border-accent-foreground border-t"
      value={open ? ["mappings"] : []}
      onValueChange={(value) => {
        const nextOpen = value.includes("mappings");
        setOpen(nextOpen);
        if (nextOpen && mappings === null) void load();
      }}
    >
      <AccordionItem value="mappings" className="min-w-0 border-0">
        <AccordionTrigger
          className="items-center px-4 py-4 text-sm sm:px-6"
          classList={{
            trigger: {
              icon: "mr-0 size-4 shrink-0 group-data-panel-open:rotate-180 motion-reduce:transition-none",
            },
          }}
        >
          {translate("mappings")}
        </AccordionTrigger>
        <AccordionPanel className="motion-reduce:transition-none">
          <div className="px-4 pb-4 sm:px-6">
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("mappingsIntro")}
            </p>
            {pending && (
              <p role="status" className="mt-4 text-foreground-dimmed text-sm">
                {translate("working")}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-error text-sm">
                {translate("actionFailed")}
              </p>
            )}
            {mappings?.length === 0 && (
              <p className="mt-4 text-foreground-dimmed text-sm">
                {translate("noMappings")}
              </p>
            )}
          </div>
          {mappings && mappings.length > 0 && (
            <div className="divide-y divide-accent-foreground border-accent-foreground border-t">
              {mappings.map((mapping) => (
                <Mapping key={mapping.id} store={store} mapping={mapping} />
              ))}
            </div>
          )}
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
