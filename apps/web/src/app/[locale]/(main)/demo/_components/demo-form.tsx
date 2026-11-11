"use client";

import { Button } from "@zenncore/web/components/button";
import { InferredForm } from "@zenncore/web/components/inferred-form";
import type { getMessages } from "next-intl/server";
import { useEffect, useRef, useState } from "react";
import {
  createLeadFields,
  type LeadCopy,
} from "@/components/marketing/lead-fields";
import {
  LeadPrivacy,
  useLeadSubmission,
} from "@/components/marketing/lead-form";
import { MarketingActions } from "@/components/marketing/primitives";
import {
  type DemoAbout,
  type DemoGoals,
  demoAboutSchema,
  demoGoalsSchema,
} from "@/lib/marketing-lead";

export const DemoForm = ({ copy, formCopy, locale }: DemoForm.Props) => {
  const [step, setStep] = useState<DemoForm.Step>(0);
  const [about, setAbout] = useState<Partial<DemoAbout>>({});
  const [goals, setGoals] = useState<Partial<DemoGoals>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(step);
  const state = useLeadSubmission(copy);
  const fields = createLeadFields(copy);
  const aboutConfig = {
    name: fields.name,
    email: fields.email,
    company: fields.company,
    website: fields.website,
    businessType: fields.businessType,
    catalogSize: fields.catalogSize,
    markets: fields.markets,
  };
  const goalsConfig = { goals: fields.goals, aiChannel: fields.aiChannel };
  const moveTo = (next: DemoForm.Step) => {
    setStep(next);
  };
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    heading.current?.focus();
  }, [step]);

  const submit = () => {
    const contact = demoAboutSchema.safeParse(about);
    const focus = demoGoalsSchema.safeParse(goals);
    if (!contact.success) {
      moveTo(0);
      return;
    }
    if (!focus.success) {
      moveTo(1);
      return;
    }
    state.submit({
      ...contact.data,
      ...focus.data,
      kind: "demo",
      topic: "enterprise-demo",
      locale,
    });
  };

  const review = [
    { label: copy.fields.name.label, value: about.name },
    { label: copy.fields.email.label, value: about.email },
    { label: copy.fields.company.label, value: about.company },
    { label: copy.fields.website.label, value: about.website },
    {
      label: copy.fields.businessType.label,
      value: copy.options.businessType.find(
        (option) => option.value === about.businessType,
      )?.label,
    },
    {
      label: copy.fields.catalogSize.label,
      value: copy.options.catalogSize.find(
        (option) => option.value === about.catalogSize,
      )?.label,
    },
    { label: copy.fields.markets.label, value: about.markets },
    { label: copy.fields.goals.label, value: goals.goals },
    {
      label: copy.fields.aiChannel.label,
      value: copy.options.aiChannel.find(
        (option) => option.value === goals.aiChannel,
      )?.label,
    },
  ];

  return (
    <div
      className="marketing-demo-layout grid grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-1"
      aria-busy={state.isPending}
    >
      <nav
        aria-label={formCopy.progress}
        className="marketing-demo-progress max-md:[&_li>span]:text-(length:--text-2xl) border-[var(--rail-color)] border-r px-7 py-9 max-md:border-r-0 max-md:border-b max-md:px-5 max-md:py-4 [&_li>span]:font-heading [&_li>span]:text-[30px] max-md:[&_li>span]:block [&_li[aria-current=step]]:text-primary-text [&_li]:flex [&_li]:items-baseline [&_li]:gap-4 [&_li]:py-[18px] [&_li]:text-foreground-dimmed max-md:[&_li]:block max-md:[&_li]:py-1 max-md:[&_li]:text-[13px] max-md:[&_ol]:grid max-md:[&_ol]:grid-cols-3 max-md:[&_ol]:gap-3"
      >
        <ol>
          {formCopy.steps.map((label, index) => (
            <li key={label} aria-current={step === index ? "step" : undefined}>
              <span aria-hidden="true">0{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </nav>
      <div className="marketing-demo-body px-7 py-12 max-md:px-5 max-md:py-9">
        {state.sent ? (
          <div role="status">
            <h3>{copy.status.sentTitle}</h3>
            <p className="mt-4">{formCopy.sentDescription}</p>
            <MarketingActions
              actions={[
                {
                  href: "https://cal.com/ecentic-ai/15min",
                  label: copy.action.quaternary,
                },
              ]}
            />
          </div>
        ) : (
          <>
            <h3 ref={heading} tabIndex={-1} className="mb-8">
              {formCopy.steps[step]}
            </h3>
            {step === 0 && (
              <InferredForm
                key="about"
                config={aboutConfig}
                defaultValues={about}
                onChange={setAbout}
                onSubmit={(data) => {
                  setAbout(data);
                  moveTo(1);
                }}
                className="marketing-lead-fields grid gap-x-6 gap-y-5 md:grid-cols-2 [&>*]:my-0 [&>*]:min-w-0 [&_button[type=submit]]:justify-self-start"
              >
                <Button
                  type="submit"
                  variant="flat"
                  color="primary"
                  className="min-h-12 md:col-span-2"
                >
                  {copy.action.tertiary}
                </Button>
              </InferredForm>
            )}
            {step === 1 && (
              <InferredForm
                key="goals"
                config={goalsConfig}
                defaultValues={goals}
                onChange={setGoals}
                onSubmit={(data) => {
                  setGoals(data);
                  moveTo(2);
                }}
                className="marketing-lead-fields grid gap-x-6 gap-y-5 md:grid-cols-2 [&>*]:my-0 [&>*]:min-w-0 [&_button[type=submit]]:justify-self-start"
              >
                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    color="primary"
                    onClick={() => moveTo(0)}
                  >
                    {copy.action.secondary}
                  </Button>
                  <Button
                    type="submit"
                    variant="flat"
                    color="primary"
                    className="min-h-12"
                  >
                    {copy.action.tertiary}
                  </Button>
                </div>
              </InferredForm>
            )}
            {step === 2 && (
              <div>
                <h4 className="text-2xl">{formCopy.reviewTitle}</h4>
                <p className="mt-4">{formCopy.reviewDescription}</p>
                <dl className="marketing-demo-review [&_dd]:wrap-anywhere my-7 [&>div]:grid [&>div]:grid-cols-[180px_minmax(0,1fr)] [&>div]:gap-4 [&>div]:border-[var(--rail-color)] [&>div]:border-b [&>div]:py-4 max-md:[&>div]:grid-cols-1 max-md:[&>div]:gap-1 [&_dd]:whitespace-pre-wrap [&_dt]:text-foreground-dimmed">
                  {review.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <LeadPrivacy copy={copy} />
                {state.error && (
                  <p role="alert" className="mt-4 text-error">
                    {state.error}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    color="primary"
                    disabled={state.isPending}
                    onClick={() => moveTo(1)}
                  >
                    {copy.action.secondary}
                  </Button>
                  <Button
                    type="button"
                    variant="flat"
                    color="primary"
                    disabled={state.isPending}
                    onClick={submit}
                    className="min-h-12"
                  >
                    {state.isPending ? copy.pending : copy.action.primary}
                  </Button>
                </div>
                <p className="marketing-note text-(length:--text-sm) mt-6 mt-8 text-foreground-dimmed">
                  {formCopy.bookingNote}
                </p>
                <MarketingActions
                  actions={[
                    {
                      href: "https://cal.com/ecentic-ai/15min",
                      label: copy.action.quaternary,
                    },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export namespace DemoForm {
  export type Copy = Awaited<
    ReturnType<typeof getMessages>
  >["enterpriseDemo"]["form"];
  export type Step = 0 | 1 | 2;
  export type Props = { copy: LeadCopy; formCopy: Copy; locale: "en" | "es" };
}
