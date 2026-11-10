"use client";

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
import "./lead.css";

const LazyLeadForm = lazy(() =>
  import("./lead-form").then((module) => ({ default: module.LeadForm })),
);

export const InterestLead = ({
  topic,
  title,
  triggerLabel,
  locale,
  copy,
}: {
  topic: string;
  title?: string;
  triggerLabel?: string;
  locale: "en" | "es";
  copy: AppConfig["Messages"]["enterpriseLead"];
}) => {
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
      <DialogTrigger className="h-auto min-h-11 whitespace-normal py-2 text-left text-primary">
        {triggerLabel ?? content.title}
      </DialogTrigger>
      <DialogPopup
        keepMounted={hasOpened}
        initialFocus={heading}
        className="marketing-site marketing-lead-dialog"
        classList={{ backdrop: "z-[110]" }}
      >
        <DialogTitle
          ref={heading}
          tabIndex={-1}
          className="marketing-lead-dialog-title"
        >
          {title ?? content.title}
        </DialogTitle>
        <DialogDescription>{content.description}</DialogDescription>
        {hasOpened && (
          <Suspense
            fallback={
              <p role="status" className="marketing-lead-loading">
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
        <DialogClose className="mt-6" disabled={isPending}>
          {copy.dialog.action.primary}
        </DialogClose>
      </DialogPopup>
    </Dialog>
  );
};
