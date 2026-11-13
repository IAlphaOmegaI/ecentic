"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useSearchParams } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";
import { useOnboardingError } from "../../../_components/use-onboarding-error";

export const OneClickConnect = () => {
  const translate = useTranslations("onboarding.connect");
  const messages = useMessages();
  const experience = useTranslations("onboarding.experience");
  const formatError = useOnboardingError();
  const searchParameters = useSearchParams();
  const error = searchParameters.get("error");
  const installRequired = searchParameters.get("status") === "install_required";
  const storeUrl = searchParameters.get("store_url") ?? "";

  const errorMessage = (() => {
    if (!error) return null;

    switch (error) {
      case "missing_store_url":
      case "bad_store_url":
      case "invalid_state":
      case "token_exchange":
        return translate(`woocommerce.oneClick.errors.${error}`);
      default:
        return formatError({ name: "request-error" });
    }
  })();

  const config = useMemo(
    () =>
      ({
        storeUrl: field({
          shape: "text",
          inputMode: "url",
          label: experience("storeAddress"),
          placeholder: translate("woocommerce.oneClick.placeholder"),
          validator: z
            .string({
              error: translate("woocommerce.fields.domain.validation"),
            })
            .trim()
            .url(translate("woocommerce.fields.domain.validation")),
        }),
      }) satisfies GenericForm,
    [experience, translate],
  );

  const installSteps =
    messages.onboarding.connect.woocommerce.oneClick.installRequired.steps;

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 font-light text-error text-sm">
          {errorMessage}
        </p>
      )}

      {installRequired && (
        <div className="flex flex-col gap-3 rounded-md border border-accent-foreground bg-background-dimmed px-4 py-3">
          <p className="font-medium text-foreground">
            {translate("woocommerce.oneClick.installRequired.title", {
              store:
                storeUrl ||
                translate("woocommerce.oneClick.installRequired.thatStore"),
            })}
          </p>
          <ol className="flex list-inside list-decimal flex-col gap-2 font-light text-foreground-dimmed text-sm">
            {installSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {storeUrl && (
            <Button
              color="accent"
              className="w-fit"
              render={
                <a
                  href={`${storeUrl}/wp-admin/plugin-install.php?s=ecentic&tab=search&type=term`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {translate(
                "woocommerce.oneClick.installRequired.openPluginScreen",
              )}
              <ArrowRightIcon className="size-4" />
            </Button>
          )}
        </div>
      )}

      <InferredForm
        config={config}
        defaultValues={{ storeUrl }}
        onSubmit={({ storeUrl: address }) => {
          window.location.assign(
            `/api/integrations/woo/start?${new URLSearchParams({ store_url: address })}`,
          );
        }}
        className="flex flex-col gap-4"
      >
        <Button type="submit" color="primary" className="w-full">
          {installRequired
            ? translate("woocommerce.oneClick.action.tryAgain")
            : translate("woocommerce.oneClick.action.connect")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </InferredForm>
    </div>
  );
};
