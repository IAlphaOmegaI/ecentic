"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useLinkStatus } from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as Entry from "@/server/app/entry";

/**
 * Skips the connect step. With a store carried over from the landing hero the
 * entry is forgotten on the way out — otherwise the proxy would keep routing
 * this account back here to finish an import it chose to skip.
 */
export const Skip = ({ entry }: Skip.Props) => {
  const translate = useTranslations("onboarding.connect");
  const locale = useLocale();

  // Redirects from the action; a rejected call leaves the button to retry.
  const [handleSkip, isPending] = useAsyncAction(async () => {
    await resultify(() =>
      Entry.dismiss({ locale, href: "/onboarding/products" }),
    );
  });

  if (!entry)
    return (
      <Button
        color="accent"
        type="button"
        render={<Link href="/onboarding/products" />}
      >
        <Label />
      </Button>
    );

  return (
    <Button
      color="accent"
      type="button"
      disabled={isPending}
      onClick={() => void handleSkip()}
    >
      {translate("action.skip")}
      {isPending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </Button>
  );
};

const Label = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.connect");

  return (
    <>
      {translate("action.skip")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};

export namespace Skip {
  export type Props = {
    /** Whether a hero entry is waiting on this step. */
    entry: boolean;
  };
}
