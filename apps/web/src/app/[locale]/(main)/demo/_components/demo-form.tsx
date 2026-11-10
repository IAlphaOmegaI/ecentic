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
import "@/components/marketing/lead.css";

type DemoCopy = Awaited<
  ReturnType<typeof getMessages>
>["enterpriseDemo"]["form"];
type Step = 0 | 1 | 2;

export const DemoForm = ({
  copy,
  formCopy,
  locale,
}: {
  copy: LeadCopy;
  formCopy: DemoCopy;
  locale: "en" | "es";
}) => {
  const [step, setStep] = useState<Step>(0);
  const [about, setAbout] = useState<Partial<DemoAbout>>({});
  const [goals, setGoals] = useState<Partial<DemoGoals>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
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
  const moveTo = (next: Step) => {
    setStep(next);
  };
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
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
    <div className="marketing-demo-layout" aria-busy={state.isPending}>
      <nav aria-label={formCopy.progress} className="marketing-demo-progress">
        <ol>
          {formCopy.steps.map((label, index) => (
            <li key={label} aria-current={step === index ? "step" : undefined}>
              <span aria-hidden="true">0{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </nav>
      <div className="marketing-demo-body">
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
                className="marketing-lead-fields"
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
                className="marketing-lead-fields"
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
                <dl className="marketing-demo-review">
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
                <p className="marketing-note mt-8">{formCopy.bookingNote}</p>
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
