"use client";

import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import type { AppConfig } from "next-intl";
import { lazy, Suspense, useRef, useState } from "react";
import { fonts } from "@/components/marketing/fonts";
import type { Locale } from "@/i18n/locales";

const LazyLeadForm = lazy(() =>
  import("./lead-form").then((module) => ({ default: module.LeadForm })),
);

export const InterestLead = ({
  topic,
  title,
  triggerLabel,
  triggerColor,
  triggerVariant,
  locale,
  copy,
}: InterestLead.Props) => {
  const [hasOpened, setHasOpened] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = copy.kinds.interest;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
    >
      <Button
        color={triggerColor}
        variant={triggerVariant}
        render={<DialogTrigger />}
      >
        {triggerLabel ?? content.title}
      </Button>
      <DialogPopup
        keepMounted={hasOpened}
        initialFocus={heading}
        className={cn(
          "marketing-grid-pattern marketing-site marketing-lead-dialog text-(length:--text-base) z-120 mt-0 max-h-[calc(100dvh-48px)] w-[min(720px,calc(100vw-32px))] max-w-none overflow-y-auto rounded-none bg-background p-8 font-body text-foreground leading-relaxed [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-sm [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-sm [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-sm [&_:where(input,textarea,select,[role=combobox])]:rounded-sm [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-260 [:where(&)_:where(h1)]:text-5xl lg:[:where(&)_:where(h1)]:text-6xl xl:[:where(&)_:where(h1)]:text-7xl [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-none [:where(&)_:where(h1,h2,h3,h4)]:tracking-tight [:where(&)_:where(h2)]:max-w-225 [:where(&)_:where(h2)]:text-3xl lg:[:where(&)_:where(h2)]:text-4xl xl:[:where(&)_:where(h2)]:text-5xl 2xl:[:where(&)_:where(h2)]:text-6xl [:where(&)_:where(h3)]:text-2xl 2xl:[:where(&)_:where(h3)]:text-3xl",
          fonts,
        )}
        classList={{ backdrop: "z-[110]" }}
      >
        <DialogTitle
          ref={heading}
          tabIndex={-1}
          className="marketing-lead-dialog-title mb-6 text-3xl"
        >
          {title ?? content.title}
        </DialogTitle>
        <DialogDescription>{content.description}</DialogDescription>
        {hasOpened && (
          <Suspense
            fallback={
              <p
                role="status"
                className="marketing-lead-loading min-h-70 py-6 text-foreground-dimmed"
              >
                {copy.dialog.loading}
              </p>
            }
          >
            <LazyLeadForm
              kind="interest"
              topic={topic}
              locale={locale}
              copy={copy}
              onPendingChange={setIsPending}
            />
          </Suspense>
        )}
        <DialogClose className="mt-6 rounded-sm" disabled={isPending}>
          {copy.dialog.action.primary}
        </DialogClose>
      </DialogPopup>
    </Dialog>
  );
};

export namespace InterestLead {
  export type Props = {
    topic: string;
    title?: string;
    triggerLabel?: string;
    triggerColor?: Button.Props["color"];
    triggerVariant?: Button.Props["variant"];
    locale: Locale;
    copy: AppConfig["Messages"]["enterpriseLead"];
  };
}
