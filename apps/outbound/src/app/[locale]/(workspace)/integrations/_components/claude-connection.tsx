"use client";

import { ArrowRightIcon, RobotIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
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
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import * as Claude from "@/server/app/outbound/claude-actions";
import { Notice } from "../../_components/common";

export type ClaudeConfiguration = {
  configured: boolean;
  model: "claude-sonnet-5-5" | "claude-opus-5-5";
  workspaceId: string;
};

export const ClaudeConnection = ({
  configuration,
}: {
  configuration: ClaudeConfiguration | null;
}) => {
  const t = useTranslations("outbound.claude");
  const messages = useMessages();
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const configured = saved || configuration?.configured;
  const config = {
    apiKey: field({
      shape: "text",
      type: "password",
      autoComplete: "off",
      disabled: pending,
      validator: z
        .string()
        .trim()
        .min(1, t("keyRequired"))
        .max(4096, t("invalid")),
      label: t("keyLabel"),
      description: t("keyHelp"),
      maskToggleLabels: { show: t("showKey"), hide: t("hideKey") },
    }),
    model: field({
      shape: "select",
      disabled: pending,
      validator: z.enum(["claude-sonnet-5-5", "claude-opus-5-5"]),
      label: t("modelLabel"),
      items: [
        { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
        { value: "claude-opus-5-5", label: "Claude Opus 5.5" },
      ],
    }),
    workspaceId: field({
      shape: "text",
      autoComplete: "off",
      disabled: pending,
      validator: z
        .string()
        .trim()
        .max(100, t("invalid"))
        .regex(/^$|^wrkspc_[A-Za-z0-9]+$/, t("invalid")),
      label: t("workspaceLabel"),
      description: t("workspaceHelp"),
    }),
  };
  return (
    <section
      id="claude"
      className="grid scroll-mt-6 gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
          <RobotIcon aria-hidden className="size-5 text-primary" />
          {t("title")}
        </h2>
        <p className="mt-3 text-foreground-dimmed text-sm leading-6">
          {t("description")}
        </p>
        <p className="mt-4 text-foreground-dimmed text-sm">
          {t(
            configured
              ? "connected"
              : configuration
                ? "notConnected"
                : "unknown",
          )}
        </p>
      </div>
      <div className="min-w-0 max-w-xl space-y-5">
        <p className="text-foreground-dimmed text-sm leading-6">
          {t("setupHelp")}
        </p>
        <Button
          variant="soft"
          color="neutral"
          render={
            <a
              href="https://platform.claude.com/settings/keys"
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          {t("connection.action.tertiary")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
        <p className="text-foreground-dimmed text-sm leading-6">
          {t("billingHelp")}
        </p>
        <p className="text-foreground-dimmed text-sm leading-6">
          {t("creditsHelp")}
        </p>
        <InferredForm
          config={config}
          renderFields={false}
          defaultValues={{
            apiKey: "",
            model: configuration?.model ?? "claude-sonnet-5-5",
            workspaceId: configuration?.workspaceId ?? "",
          }}
          onSubmit={async (values, form) => {
            if (running.current) return;
            running.current = true;
            setPending(true);
            setNotice(null);
            const result = await resultify(() => Claude.saveKey(values));
            if (!result.success || !result.data.success) {
              const error = !result.success
                ? result.error
                : !result.data.success
                  ? result.data.error
                  : null;
              const parsed = z.object({ message: z.string() }).safeParse(error);
              const errors = messages.outbound.claude.errors;
              setNotice({
                error: true,
                text:
                  parsed.success && Object.hasOwn(errors, parsed.data.message)
                    ? errors[parsed.data.message as keyof typeof errors]
                    : t("saveError"),
              });
            } else {
              form.reset({ ...values, apiKey: "" });
              setSaved(true);
              setNotice({ error: false, text: t("keySaved") });
              router.refresh();
            }
            running.current = false;
            setPending(false);
          }}
          className="space-y-4"
        >
          <InferredFormField name="apiKey" {...config.apiKey} />
          <Accordion className="border-accent-foreground border-y">
            <AccordionItem value="advanced" className="border-b-0">
              <AccordionTrigger className="py-3 text-sm">
                {t("advanced")}
              </AccordionTrigger>
              <AccordionPanel keepMounted>
                <div className="space-y-4 pb-4">
                  <InferredFormField
                    name="model"
                    {...config.model}
                    className="min-w-0"
                  />
                  <InferredFormField
                    name="workspaceId"
                    {...config.workspaceId}
                  />
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          <Button type="submit" disabled={pending}>
            {t(
              pending
                ? "saving"
                : configured
                  ? "connection.action.secondary"
                  : "connection.action.primary",
            )}
          </Button>
          <Notice value={notice} />
        </InferredForm>
      </div>
    </section>
  );
};
