"use client";

import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { InferredForm } from "@zenncore/web/components/inferred-form";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import type { MarketingLeadInput } from "@/lib/marketing-lead";
import * as Leads from "@/server/app/marketing-lead";
import { createLeadFields, type LeadCopy } from "./lead-fields";

export const LeadPrivacy = ({ copy }: LeadPrivacy.Props) => (
  <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed md:col-span-2">
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
  locale: Locale;
  topic: string;
};

const InterestForm = ({
  copy,
  onSubmit,
  children,
  locale,
  topic,
}: InterestForm.Props) => {
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
      className="marketing-lead-fields grid gap-x-6 gap-y-5 md:grid-cols-2 [&>*]:my-0 [&>*]:min-w-0 [&_button[type=submit]]:justify-self-start"
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
}: IntegrationForm.Props) => {
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
      className="marketing-lead-fields grid gap-x-6 gap-y-5 md:grid-cols-2 [&>*]:my-0 [&>*]:min-w-0 [&_button[type=submit]]:justify-self-start"
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
}: PartnerForm.Props) => {
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
      className="marketing-lead-fields grid gap-x-6 gap-y-5 md:grid-cols-2 [&>*]:my-0 [&>*]:min-w-0 [&_button[type=submit]]:justify-self-start"
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
  locale,
  copy,
  onPendingChange,
}: LeadForm.Props) => {
  const state = useLeadSubmission(copy);
  useEffect(() => {
    onPendingChange?.(state.isPending);
  }, [onPendingChange, state.isPending]);
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
  return (
    <div
      className="marketing-lead mt-8 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]"
      aria-busy={state.isPending}
    >
      {state.sent ? (
        <div role="status">
          <h3>{copy.status.sentTitle}</h3>
          <p className="mt-6">{copy.status.sentDescription}</p>
        </div>
      ) : (
        <>
          {kind !== "interest" && (
            <>
              <h3>{title ?? content.title}</h3>
              <p className="mt-6 mb-8">{content.description}</p>
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
              variant="default"
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
};

export namespace LeadPrivacy {
  export type Props = { copy: LeadCopy };
}

namespace InterestForm {
  export type Props = FormProps;
}

namespace IntegrationForm {
  export type Props = FormProps;
}

namespace PartnerForm {
  export type Props = FormProps;
}

export namespace LeadForm {
  export type Props = {
    kind: "interest" | "integration" | "partner";
    topic: string;
    title?: string;
    locale: Locale;
    copy: LeadCopy;
    onPendingChange?: (pending: boolean) => void;
  };
}
