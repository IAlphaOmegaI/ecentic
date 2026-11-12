"use client";

import {
  CheckIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  UserIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
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
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { MarketingActions } from "@/components/marketing/primitives";
import {
  type DemoAbout,
  type DemoGoals,
  demoAboutSchema,
  demoGoalsSchema,
} from "@/lib/marketing-lead";

const stepIcons = [UserIcon, CommerceChartActivity_2Icon, CommerceFilePenIcon];

export const DemoForm = ({
  copy,
  formCopy,
  progressCopy,
  locale,
}: DemoForm.Props) => {
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
    <div className="marketing-demo-layout min-w-0" aria-busy={state.isPending}>
      <nav
        aria-label={formCopy.progress}
        className="relative border-accent-foreground border-b bg-background-rich"
      >
        <MarketingEdgeCrosses />
        <ol className="grid grid-cols-3">
          {formCopy.steps.map((label, index) => {
            const complete = index < step || state.sent;
            const current = step === index && !state.sent;
            const Icon = complete ? CheckIcon : (stepIcons[index] ?? UserIcon);
            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className="relative min-w-0 px-8 py-7 max-sm:px-3 max-sm:py-5"
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[3.25rem] right-0 left-0 h-px max-sm:top-[2.75rem]",
                    index === 0 && "left-8 max-sm:left-3",
                    index === 2 &&
                      "right-[calc(100%_-_2rem)] max-sm:right-[calc(100%_-_0.75rem)]",
                    complete ? "bg-primary-text/50" : "bg-accent-foreground",
                  )}
                />
                <span
                  className={cn(
                    "relative grid size-12 place-items-center rounded-lg border shadow-sm transition-colors motion-reduce:transition-none",
                    current
                      ? "border-primary-text bg-primary-text text-background-rich"
                      : complete
                        ? "border-primary-text/30 bg-primary-text/10 text-primary-text"
                        : "border-accent-foreground bg-background-rich text-foreground-dimmed",
                  )}
                >
                  <Icon aria-hidden="true" className="size-8" />
                </span>
                <p className="mt-4 flex items-baseline gap-2 font-heading text-xl leading-tight max-sm:text-base">
                  <span
                    aria-hidden="true"
                    className="text-primary-text tabular-nums"
                  >
                    0{index + 1}
                  </span>
                  <span>{label}</span>
                </p>
                <p
                  className={cn(
                    "mt-2 text-sm",
                    current ? "text-primary-text" : "text-foreground-dimmed",
                  )}
                >
                  {complete
                    ? progressCopy.completed
                    : current
                      ? progressCopy.current
                      : progressCopy.upcoming}
                </p>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="marketing-demo-body px-8 py-10 max-md:px-4 max-md:py-8">
        {state.sent ? (
          <div role="status">
            <h3>{copy.status.sentTitle}</h3>
            <p className="mt-6">{formCopy.sentDescription}</p>
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
            <h3 ref={heading} tabIndex={-1} className="mb-6">
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
                  variant="default"
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
                    variant="default"
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
                <p className="mt-6">{formCopy.reviewDescription}</p>
                <dl className="marketing-demo-review [&_dd]:wrap-anywhere my-8 [&>div]:grid [&>div]:grid-cols-[180px_minmax(0,1fr)] [&>div]:gap-4 [&>div]:border-[var(--rail-color)] [&>div]:border-b [&>div]:py-4 max-md:[&>div]:grid-cols-1 max-md:[&>div]:gap-1 [&_dd]:whitespace-pre-wrap [&_dt]:text-foreground-dimmed">
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
                    variant="default"
                    color="primary"
                    disabled={state.isPending}
                    onClick={submit}
                    className="min-h-12"
                  >
                    {state.isPending ? copy.pending : copy.action.primary}
                  </Button>
                </div>
                <p className="marketing-note text-(length:--text-sm) mt-8 text-foreground-dimmed">
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
  export type Props = {
    copy: LeadCopy;
    formCopy: Copy;
    progressCopy: Awaited<
      ReturnType<typeof getMessages>
    >["demoPage"]["progress"];
    locale: "en" | "es";
  };
}
