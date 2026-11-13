"use client";

import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

export namespace PrePhase {
  export type Props = {
    children: ReactNode;
    onRun: () => void;
    canRun: boolean;
    isRunning: boolean;
  };
}

export const PrePhase = ({
  children,
  onRun,
  canRun,
  isRunning,
}: PrePhase.Props) => {
  const translate = useTranslations("onboarding.scan");

  return (
    <Motion.Stagger
      key="pre"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      <Motion.Item className="relative shrink-0 border-accent-foreground border-t bg-background-rich">
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Button
            color="accent"
            type="button"
            render={<Link href="/onboarding/competitors" />}
          >
            <ArrowLeftIcon className="size-4" />
            {translate("pre.action.back")}
          </Button>
          <Button
            color="primary"
            type="button"
            onClick={onRun}
            disabled={!canRun || isRunning}
          >
            {translate("pre.action.run")}
            {isRunning ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
          </Button>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};
