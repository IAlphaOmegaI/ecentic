"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import { Progress } from "@zenncore/web/components/progress";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

/** Trial dates, prices and progress all come from the stored subscription. */
export const TrialCard = ({
  plan,
  price,
  daysLeft,
  endsOn,
  progress,
}: TrialCard.Props) => {
  const [open, setOpen] = useState(false);
  const translate = useTranslations("dashboard.trial");
  const general = useTranslations("general");
  const messages = useMessages();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-2 border-accent-foreground border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium text-warning text-xs">
            <span aria-hidden className="inline-block size-2 bg-warning" />
            {translate("badge")}
          </span>
          <span className="text-foreground-dimmed text-xs tabular-nums">
            {translate("daysLeft", { days: String(daysLeft) })}
          </span>
        </div>
        {progress && (
          <Progress
            value={progress.used}
            max={progress.total}
            aria-label={translate("modal.progress")}
            classList={{
              track: "bg-accent-foreground",
              indicator: "h-full bg-warning/60 motion-reduce:transition-none",
            }}
          />
        )}
        <p className="text-foreground-dimmed text-xs">
          {translate("endsOn", { date: endsOn })}
        </p>
        <Button variant="ghost" color="neutral" render={<DialogTrigger />}>
          {translate("upgradeHint")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>

      <DialogPopup
        classList={{
          root: "z-50 m-0 max-h-dvh w-lg overflow-y-auto bg-background-rich p-0 motion-reduce:transition-none",
          backdrop: "z-50 motion-reduce:transition-none",
        }}
      >
        <header className="flex items-start justify-between gap-4 border-accent-foreground border-b px-6 py-4">
          <div>
            <p className="mb-2 flex items-center gap-2 font-medium text-warning text-xs">
              <span aria-hidden className="inline-block size-2 bg-warning" />
              {translate("modal.endingIn", { date: endsOn })}
            </p>
            <DialogTitle>{translate("modal.title", { plan })}</DialogTitle>
            <DialogDescription className="mb-0">
              {translate("modal.description")}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            color="neutral"
            size="icon"
            aria-label={general("dismiss.label")}
            render={<DialogClose />}
          >
            <XIcon className="size-4" />
          </Button>
        </header>

        {progress && (
          <div className="border-accent-foreground border-b px-6 py-4">
            <div className="mb-2 flex items-center justify-between gap-2 text-foreground-dimmed text-xs">
              <span>{translate("modal.progress")}</span>
              <span className="tabular-nums">
                {translate("modal.daysUsed", {
                  used: String(progress.used),
                  total: String(progress.total),
                })}
              </span>
            </div>
            <Progress
              value={progress.used}
              max={progress.total}
              aria-label={translate("modal.progress")}
              classList={{
                track: "bg-accent-foreground",
                indicator: "h-full bg-warning motion-reduce:transition-none",
              }}
            />
          </div>
        )}

        <div className="border-accent-foreground border-b px-6 py-4">
          <p className="mb-4 font-medium text-foreground-dimmed text-xs">
            {translate("modal.featuresHeading", { plan })}
          </p>
          <ul className="grid gap-2">
            {messages.dashboard.trial.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <CheckIcon className="size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <footer className="px-6 py-4">
          {price && (
            <p className="mb-4 flex items-end gap-2">
              <span className="font-semibold text-4xl leading-none">
                {price}
              </span>
              <span className="text-foreground-dimmed text-sm">
                {translate("modal.pricePerMonth")}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              color="primary"
              render={<Link href="/dashboard/settings?tab=billing" />}
              onClick={() => setOpen(false)}
            >
              {translate("modal.action.primary")}
            </Button>
            <Button variant="ghost" color="neutral" render={<DialogClose />}>
              {translate("modal.action.secondary", {
                days: String(daysLeft),
              })}
            </Button>
          </div>
        </footer>
      </DialogPopup>
    </Dialog>
  );
};

export namespace TrialCard {
  export type Props = {
    plan: string;
    price: string | null;
    daysLeft: number;
    endsOn: string;
    progress: { used: number; total: number; percent: number } | null;
  };
}
