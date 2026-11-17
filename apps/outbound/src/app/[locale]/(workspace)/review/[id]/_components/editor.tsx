"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  FileSearchIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  InferredForm,
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  countWords,
  deliveredBody,
  type Playbook,
  type Prospect,
} from "@/lib/outbound";
import { distinctReviewIssues, reviewState } from "@/lib/outbound-review-state";
import * as Outbound from "@/server/app/outbound";
import {
  Multiline,
  Notice,
  Status,
  Submit,
  useMutation,
} from "../../../_components/common";

const SentMessage = ({ value }: { value?: string | null }) => (
  <div className="whitespace-pre-wrap break-words rounded-lg bg-background p-4 font-body text-sm leading-6">
    {value}
  </div>
);

export const ReviewEditor = ({
  prospect,
  playbook,
  backHref,
}: {
  prospect: Prospect;
  playbook: Playbook;
  backHref: string;
}) => {
  const t = useTranslations("outbound");
  const messages = useMessages();
  const issueLabels = messages.outbound.issues;
  const format = useFormatter();
  const state = reviewState(prospect);
  const issues = distinctReviewIssues(prospect.issues);
  const hold = (() => {
    if (!prospect.holdReason) return null;
    if (prospect.holdReason === "playbookChanged")
      return t("review.panel.playbookChanged");
    const label = Object.entries(messages.outbound.automation.reasons).find(
      ([key]) => key === prospect.holdReason,
    )?.[1];
    return (
      label ??
      (/\s/.test(prospect.holdReason)
        ? prospect.holdReason
        : t("review.panel.systemHold"))
    );
  })();
  const checkedAt = Date.parse(
    prospect.shoppingFinding?.checkedAt ?? prospect.evidenceCheckedAt ?? "",
  );
  const mutation = useMutation();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewBody, setPreviewBody] = useState(
    prospect.messages.at(0)?.body ?? "",
  );
  const [words, setWords] = useState(
    countWords(prospect.messages.at(0)?.body ?? ""),
  );
  const initial = {
    subject: prospect.messages.at(0)?.subject ?? "",
    body: prospect.messages.at(0)?.body ?? "",
    followupOne: prospect.messages.at(1)?.body ?? "",
    followupTwo: prospect.messages.at(2)?.body ?? "",
  };
  const config = {
    subject: field({
      shape: "text",
      validator: z.string().min(1).max(300),
      label: t("review.fields.subject"),
      disabled: prospect.sentStep >= 1,
    }),
    body: field({
      shape: "custom",
      Component: prospect.sentStep >= 1 ? SentMessage : Multiline,
      validator: z.string().min(1).max(6000),
      label: t("review.first"),
    }),
    followupOne: field({
      shape: "custom",
      Component: prospect.sentStep >= 2 ? SentMessage : Multiline,
      validator: z.string().min(1).max(1000),
      label: t("review.followupOne"),
      description: t("review.afterDays", { count: playbook.followupOneDays }),
    }),
    followupTwo: field({
      shape: "custom",
      Component: prospect.sentStep >= 3 ? SentMessage : Multiline,
      validator: z.string().min(1).max(1000),
      label: t("review.followupTwo"),
      description: t("review.afterDays", { count: playbook.followupTwoDays }),
    }),
  };
  return (
    <div className="min-w-0">
      <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending}
          render={<Link href={backHref} />}
          onClick={(event) => {
            if (!dirty) return;
            event.preventDefault();
            setLeaving(true);
          }}
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t("review.queue.action.secondary")}
        </Button>
        <AlertDialog open={leaving} onOpenChange={setLeaving}>
          <AlertDialogPopup>
            <AlertDialogTitle>
              {t("review.queue.discard.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("review.queue.discard.description")}
            </AlertDialogDescription>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialogClose
                render={<Button variant="soft" color="neutral" />}
              >
                {t("review.queue.discard.action.secondary")}
              </AlertDialogClose>
              <Button onClick={() => router.push(backHref)}>
                {t("review.queue.discard.action.primary")}
              </Button>
            </div>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="min-w-0">
          <Link
            href={`/prospects/${prospect.id}`}
            className="break-words font-semibold text-foreground-rich text-xl hover:text-primary"
          >
            {prospect.company}
          </Link>
          <p className="mt-2 flex items-start gap-2 break-words text-foreground-dimmed text-sm">
            <EnvelopeIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {prospect.name} · {prospect.email}
            </span>
          </p>
          <p className="mt-1 break-words text-foreground-dimmed text-xs">
            {playbook.fromName} · {prospect.senderEmail}
          </p>
        </div>
        <Status value={prospect.status} />
      </div>
      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <InferredForm
          config={config}
          defaultValues={initial}
          renderFields={false}
          onChange={(values) => {
            setDirty(
              Object.entries(initial).some(
                ([key, value]) => values[key as keyof typeof initial] !== value,
              ),
            );
            setWords(countWords(values.body ?? ""));
            setPreviewBody(values.body ?? "");
          }}
          onSubmit={(values) =>
            mutation.run(() =>
              Outbound.saveDraft({
                prospect: prospect.id,
                revision: prospect.revision,
                ...values,
              }),
            )
          }
          className="min-w-0 space-y-6 px-4 py-6 sm:px-6"
        >
          <InferredFormField name="subject" {...config.subject} />
          <div className="[&_textarea]:min-h-96">
            <InferredFormField name="body" {...config.body} />
          </div>
          <div className="border-accent-foreground border-l-2 pl-4">
            <p className="text-foreground-dimmed text-xs">
              {t("review.footerTitle")}
            </p>
            <p className="mt-2 text-sm">
              {prospect.sentPostalAddress ?? playbook.postalAddress}
            </p>
          </div>
          {(["followupOne", "followupTwo"] as const).map((name) => (
            <div key={name} className="space-y-4">
              <InferredFormField name={name} {...config[name]} />
              <Accordion>
                <AccordionItem
                  value="history"
                  className="rounded-lg border border-accent-foreground px-3"
                >
                  <AccordionTrigger
                    className="text-foreground-dimmed text-xs"
                    classList={{
                      trigger: {
                        icon: "mr-0 transition-transform duration-150 motion-reduce:transition-none",
                      },
                    }}
                  >
                    {t("review.quotedHistory")}
                  </AccordionTrigger>
                  <AccordionPanel className="duration-150 motion-reduce:transition-none">
                    <div className="whitespace-pre-wrap break-words pb-3 font-body text-foreground-dimmed text-sm leading-6">
                      {deliveredBody(
                        { step: 2, subject: "", body: "", afterDays: 0 },
                        prospect.sentFirstMessage ?? {
                          step: 1,
                          subject: "",
                          body: previewBody,
                          afterDays: 0,
                        },
                        prospect.sentPostalAddress ?? playbook.postalAddress,
                      ).trimStart()}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
          <p className="text-foreground-dimmed text-xs">
            {t("common.wordCount", {
              count: words,
              maximum: playbook.maxBodyWords,
            })}
          </p>
          <Submit pending={mutation.pending}>
            {t("review.action.secondary")}
          </Submit>
          <Notice value={mutation.notice} />
        </InferredForm>
        <aside className="min-w-0 border-accent-foreground border-t bg-background/50 xl:border-t-0 xl:border-l">
          <section
            className="space-y-4 px-4 py-6 sm:px-6"
            aria-labelledby="review-approval-title"
          >
            <h2
              id="review-approval-title"
              className="flex items-center gap-2 font-semibold text-foreground-rich text-sm"
            >
              <ShieldCheckIcon aria-hidden className="size-4 text-primary" />
              {t(
                playbook.automationEnabled
                  ? "review.panel.automaticTitle"
                  : "review.panel.manualTitle",
              )}
            </h2>
            <div className="space-y-2" role="status">
              <p
                className={cn(
                  "flex items-start gap-2 font-medium text-sm",
                  state === "attention"
                    ? "text-error"
                    : ["approved", "sent"].includes(state)
                      ? "text-success"
                      : "text-foreground-rich",
                )}
              >
                {state === "attention" ? (
                  <AlertCircleIcon
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                ) : ["approved", "sent"].includes(state) ? (
                  <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <ClockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                )}
                {state === "ready" && !playbook.automationEnabled
                  ? t("review.ready")
                  : t(`review.panel.${state}`)}
              </p>
              {issues.length > 0 &&
                !(playbook.automationEnabled && state === "update") && (
                  <ul className="space-y-2 text-foreground-dimmed text-xs leading-5">
                    {issues.map((issue) => (
                      <li key={issue.code}>
                        {Object.entries(issueLabels).find(
                          ([key]) => key === issue.code,
                        )?.[1] ?? t("review.panel.unknownIssue")}
                      </li>
                    ))}
                  </ul>
                )}
              {prospect.status === "held" && hold && (
                <p className="break-words text-foreground-dimmed text-xs leading-5">
                  {hold}
                </p>
              )}
              {state === "update" && (
                <p className="text-foreground-dimmed text-xs leading-5">
                  {t("review.panel.updateNote")}
                </p>
              )}
            </div>
            <p className="text-foreground-dimmed text-xs leading-5">
              {t(
                playbook.automationEnabled
                  ? "review.panel.automaticNote"
                  : "review.approvalNote",
              )}
            </p>
            {dirty && (
              <p className="text-foreground-dimmed text-xs leading-5">
                {t("review.panel.editsPending")}
              </p>
            )}
            {(!playbook.automationEnabled || prospect.sentStep > 0) &&
              !["approved", "active"].includes(prospect.status) && (
                <Button
                  disabled={
                    mutation.pending || dirty || prospect.issues.length > 0
                  }
                  onClick={() =>
                    mutation.run(() =>
                      Outbound.reviewProspect({
                        prospect: prospect.id,
                        decision: "approve",
                        revision: prospect.revision,
                      }),
                    )
                  }
                >
                  <CheckIcon aria-hidden className="size-4" />
                  {t("review.action.primary")}
                </Button>
              )}
            {playbook.automationEnabled &&
              prospect.status === "held" &&
              prospect.sentStep === 0 && (
                <Button
                  variant="soft"
                  disabled={mutation.pending || dirty}
                  onClick={() =>
                    mutation.run(() =>
                      Outbound.reviewProspect({
                        prospect: prospect.id,
                        revision: prospect.revision,
                        decision: "review",
                        reason: "",
                      }),
                    )
                  }
                >
                  {t("review.panel.resume")}
                </Button>
              )}
            <div className="space-y-2 border-accent-foreground border-t pt-4">
              <p className="text-foreground-dimmed text-xs leading-5">
                {t(
                  playbook.sendingEnabled
                    ? "review.panel.sendingActive"
                    : "review.panel.sendingPaused",
                )}
              </p>
              {!playbook.sendingEnabled && (
                <Link
                  href="/playbook"
                  className="inline-block text-primary-text text-xs hover:underline"
                >
                  {t("review.panel.sendingSettings")}
                </Link>
              )}
            </div>
          </section>
          <section
            className="space-y-4 border-accent-foreground border-t px-4 py-6 sm:px-6"
            aria-labelledby="review-evidence-title"
          >
            <h2
              id="review-evidence-title"
              className="flex items-center gap-2 font-semibold text-foreground-rich text-sm"
            >
              <FileSearchIcon aria-hidden className="size-4 text-primary" />
              {t("review.panel.evidenceTitle")}
            </h2>
            <div className="space-y-2">
              <p className="break-words font-medium text-foreground-rich text-sm">
                {prospect.product || t("review.panel.noEvidence")}
              </p>
              {Number.isFinite(checkedAt) && (
                <p className="text-foreground-dimmed text-xs">
                  {t("review.panel.checked", {
                    date: format.dateTime(new Date(checkedAt), {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }),
                  })}
                </p>
              )}
            </div>
            {(prospect.finding ||
              prospect.evidence ||
              prospect.shoppingFinding) && (
              <Accordion>
                <AccordionItem
                  value="evidence"
                  className="border-accent-foreground"
                >
                  <AccordionTrigger
                    className="text-sm"
                    classList={{
                      trigger: {
                        icon: "mr-0 size-4 motion-reduce:transition-none",
                      },
                    }}
                  >
                    {t("review.panel.evidenceDetails")}
                  </AccordionTrigger>
                  <AccordionPanel className="duration-150 motion-reduce:transition-none">
                    <dl className="space-y-4 py-4 text-xs leading-5">
                      <div>
                        <dt className="font-medium text-foreground-rich">
                          {t("review.panel.observation")}
                        </dt>
                        <dd className="mt-2 whitespace-pre-wrap break-words">
                          {prospect.shoppingFinding?.observation ??
                            prospect.finding}
                        </dd>
                      </div>
                      {prospect.shoppingFinding ? (
                        <>
                          <div>
                            <dt className="font-medium text-foreground-rich">
                              {t("review.panel.consequence")}
                            </dt>
                            <dd className="mt-2 whitespace-pre-wrap break-words">
                              {prospect.shoppingFinding.consequence}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground-rich">
                              {t("review.panel.scope")}
                            </dt>
                            <dd className="mt-2 whitespace-pre-wrap break-words">
                              {prospect.shoppingFinding.scope}
                            </dd>
                          </div>
                        </>
                      ) : (
                        <div>
                          <dt className="font-medium text-foreground-rich">
                            {t("prospect.fields.evidence")}
                          </dt>
                          <dd className="mt-2 whitespace-pre-wrap break-words">
                            {prospect.evidence}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}
            {prospect.productUrl && (
              <Button
                variant="soft"
                color="neutral"
                render={
                  <a
                    href={prospect.productUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                {t("prospect.action.tertiary")}
              </Button>
            )}
          </section>
          <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
            <Accordion>
              <AccordionItem value="controls" className="border-0">
                <AccordionTrigger
                  className="text-sm"
                  classList={{
                    trigger: {
                      icon: "mr-0 size-4 motion-reduce:transition-none",
                    },
                  }}
                >
                  {t("review.panel.controls")}
                </AccordionTrigger>
                <AccordionPanel className="duration-150 motion-reduce:transition-none">
                  <div className="space-y-4 py-4">
                    <p className="text-foreground-dimmed text-xs leading-5">
                      {t("review.panel.holdDescription")}
                    </p>
                    <InferredForm
                      config={{
                        reason: field({
                          shape: "text",
                          validator: z.string().max(2000),
                          label: t("review.fields.reason"),
                        }),
                      }}
                      defaultValues={{ reason: "" }}
                      onSubmit={({ reason }) =>
                        mutation.run(() =>
                          Outbound.reviewProspect({
                            prospect: prospect.id,
                            decision: "hold",
                            revision: prospect.revision,
                            reason,
                          }),
                        )
                      }
                      className="space-y-4"
                    >
                      <Button
                        type="submit"
                        variant="soft"
                        color="neutral"
                        disabled={mutation.pending}
                      >
                        <ClockIcon aria-hidden className="size-4" />
                        {t("review.action.tertiary")}
                      </Button>
                    </InferredForm>
                    <Button
                      variant="soft"
                      color="error"
                      disabled={mutation.pending}
                      onClick={() =>
                        mutation.run(() =>
                          Outbound.recordOutcome({
                            prospect: prospect.id,
                            kind: "optout",
                            note: "Staff marked do not contact",
                          }),
                        )
                      }
                    >
                      <BanIcon aria-hidden className="size-4" />
                      {t("review.action.quaternary")}
                    </Button>
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </div>
        </aside>
      </div>
    </div>
  );
};
