"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useDocument } from "@/hooks/use-document";

export const NotFoundActions = ({
  homeHref,
  homeLabel,
  backLabel,
  exploreLabel,
}: NotFoundActions.Props) => {
  const { document, window } = useDocument();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="default"
        color="primary"
        render={<a href={homeHref} />}
        className="min-h-12 px-5 focus-visible:outline-solid"
      >
        {homeLabel}
        <ArrowRightIcon className="size-4" />
      </Button>
      <Button
        variant="outline"
        color="accent"
        className="min-h-12 px-5 text-foreground-rich focus-visible:outline-solid"
        disabled={!window}
        onClick={() => {
          if (!window) return;
          // A fresh tab can include about:blank in history.length.
          const canGoBack =
            window.navigation?.canGoBack ??
            Boolean(document?.referrer && window.history.length > 1);
          if (canGoBack) {
            window.history.back();
            return;
          }
          window.location.assign(homeHref);
        }}
      >
        <ArrowLeftIcon className="size-4" />
        {backLabel}
      </Button>
      <Button
        variant="ghost"
        color="primary"
        render={<a href="#explore" />}
        className="min-h-12 px-0 text-primary-text hover:bg-transparent hover:underline focus-visible:outline-solid"
      >
        {exploreLabel}
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  );
};

export namespace NotFoundActions {
  export type Props = {
    homeHref: string;
    homeLabel: string;
    backLabel: string;
    exploreLabel: string;
  };
}
