"use client";

import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import { InferredForm } from "@zenncore/web/components/inferred-form";
import { type ReactNode, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import type { MarketingLeadInput } from "@/lib/marketing-lead";
import * as Leads from "@/server/app/marketing-lead";
import { createLeadFields, type LeadCopy } from "./lead-fields";
import "./lead.css";

export const LeadPrivacy = ({ copy }: { copy: LeadCopy }) => (
  <p className="marketing-note md:col-span-2">
    {copy.privacy.text}{" "}
    <Link href="/privacy-policy" className="underline underline-offset-4">
      {copy.privacy.link}
    </Link>
  </p>
);

export const useLeadSubmission = (copy: LeadCopy) => {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = (data: MarketingLeadInput) => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await resultify(() =>
        Leads.submit({ contactSecret: data }),
      );
      if (!result.success || !result.data.success) {
        setError(copy.status.unavailable);
        return;
      }
      const outcome = result.data.data.outcome;
      if (outcome !== "sent") {
        setError(copy.status[outcome]);
        return;
      }
      setSent(true);
    });
  };
  return { submit, isPending, sent, error };
};

type FormProps = {
  copy: LeadCopy;
  onSubmit: (data: MarketingLeadInput) => void;
  children: ReactNode;
  locale: "en" | "es";
  topic: string;
};

const InterestForm = ({
  copy,
  onSubmit,
  children,
  locale,
  topic,
}: FormProps) => {
  const fields = createLeadFields(copy);
  const config = {
    name: fields.name,
    email: fields.email,
    company: fields.company,
    catalogSize: fields.catalogSize,
  };
  return (
    <InferredForm
      config={config}
      className="marketing-lead-fields"
      onSubmit={(data) =>
        onSubmit({ ...data, kind: "interest", locale, topic })
      }
    >
      {children}
    </InferredForm>
  );
};
const IntegrationForm = ({
  copy,
  onSubmit,
  children,
  locale,
  topic,
}: FormProps) => {
  const fields = createLeadFields(copy);
  const config = {
    name: fields.name,
    email: fields.email,
    company: fields.company,
    tool: fields.tool,
    catalogSize: fields.catalogSize,
  };
  return (
    <InferredForm
      config={config}
      className="marketing-lead-fields"
      onSubmit={(data) =>
        onSubmit({ ...data, kind: "integration", locale, topic })
      }
    >
      {children}
    </InferredForm>
  );
};
const PartnerForm = ({
  copy,
  onSubmit,
  children,
  locale,
  topic,
}: FormProps) => {
  const fields = createLeadFields(copy);
  const config = {
    name: fields.name,
    email: fields.email,
    company: fields.company,
    website: fields.website,
    track: fields.track,
    stores: fields.stores,
    note: fields.note,
  };
  return (
    <InferredForm
      config={config}
      defaultValues={{ note: "" }}
      className="marketing-lead-fields"
      onSubmit={(data) => onSubmit({ ...data, kind: "partner", locale, topic })}
    >
      {children}
    </InferredForm>
  );
};

export const LeadForm = ({
  kind,
  topic,
  title,
  triggerLabel,
  locale,
  copy,
}: {
  kind: "interest" | "integration" | "partner";
  topic: string;
  title?: string;
  triggerLabel?: string;
  locale: "en" | "es";
  copy: LeadCopy;
}) => {
  const state = useLeadSubmission(copy);
  const content = copy.kinds[kind];
  const Form = (() => {
    switch (kind) {
      case "interest":
        return InterestForm;
      case "integration":
        return IntegrationForm;
      case "partner":
        return PartnerForm;
    }
  })();
  const form = (
    <div className="marketing-lead" aria-busy={state.isPending}>
      {state.sent ? (
        <div role="status">
          <h3>{copy.status.sentTitle}</h3>
          <p className="mt-4">{copy.status.sentDescription}</p>
        </div>
      ) : (
        <>
          {kind !== "interest" && (
            <>
              <h3>{title ?? content.title}</h3>
              <p className="mt-4 mb-8">{content.description}</p>
            </>
          )}
          <Form
            copy={copy}
            onSubmit={state.submit}
            locale={locale}
            topic={topic}
          >
            <LeadPrivacy copy={copy} />
            {state.error && (
              <p role="alert" className="text-error md:col-span-2">
                {state.error}
              </p>
            )}
            <Button
              type="submit"
              variant="flat"
              color="primary"
              disabled={state.isPending}
              className="min-h-12 md:col-span-2"
            >
              {state.isPending ? copy.pending : content.action.primary}
            </Button>
          </Form>
        </>
      )}
    </div>
  );
  if (kind !== "interest") return form;
  return (
    <Dialog>
      <DialogTrigger className="h-auto min-h-11 whitespace-normal py-2 text-left text-primary">
        {triggerLabel ?? content.title}
      </DialogTrigger>
      <DialogPopup
        className="marketing-site marketing-lead-dialog"
        classList={{ backdrop: "z-[110]" }}
      >
        <DialogTitle className="marketing-lead-dialog-title">
          {title ?? content.title}
        </DialogTitle>
        <DialogDescription>{content.description}</DialogDescription>
        {form}
        <DialogClose className="mt-6" disabled={state.isPending}>
          {copy.dialog.action.primary}
        </DialogClose>
      </DialogPopup>
    </Dialog>
  );
};
