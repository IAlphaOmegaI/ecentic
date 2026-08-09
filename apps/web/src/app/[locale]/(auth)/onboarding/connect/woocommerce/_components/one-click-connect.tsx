"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useSearchParams } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";

export const OneClickConnect = () => {
  const translate = useTranslations("onboarding.connect");
  const messages = useMessages();
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
        return null;
    }
  })();

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

      <form
        action="/api/integrations/woo/start"
        method="GET"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          name="store_url"
          type="url"
          required
          defaultValue={storeUrl}
          placeholder={translate("woocommerce.oneClick.placeholder")}
          className="flex-1 rounded-md border border-accent-foreground bg-background px-3 py-2 text-foreground outline-none placeholder:text-foreground-dimmed focus:border-primary"
        />
        <Button type="submit" color="primary">
          {installRequired
            ? translate("woocommerce.oneClick.action.tryAgain")
            : translate("woocommerce.oneClick.action.connect")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
};
