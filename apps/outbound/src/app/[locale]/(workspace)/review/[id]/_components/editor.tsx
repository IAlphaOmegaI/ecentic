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
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  countWords,
  deliveredBody,
  type Playbook,
  type Prospect,
} from "@/lib/outbound";
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
      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_18rem]">
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
        <aside className="min-w-0 space-y-6 border-accent-foreground border-t bg-background/50 px-4 py-6 sm:px-6 xl:border-t-0 xl:border-l">
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-sm">
              <FileSearchIcon aria-hidden className="size-4 text-primary" />
              {t("review.evidenceTitle")}
            </h2>
            <p className="mt-4 text-sm">{prospect.finding}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-foreground-dimmed text-sm">
              {prospect.shoppingFinding?.consequence ?? prospect.evidence}
            </p>
            {prospect.shoppingFinding && (
              <Accordion className="mt-3">
                <AccordionItem value="research-scope">
                  <AccordionTrigger className="text-sm">
                    {t("prospect.fields.evidence")}
                  </AccordionTrigger>
                  <AccordionPanel>
                    <p className="whitespace-pre-wrap break-words pb-3 text-foreground-dimmed text-sm">
                      {prospect.shoppingFinding.scope}
                    </p>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}
            {prospect.productUrl && (
              <Button
                variant="ghost"
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
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-sm">
              <ShieldCheckIcon aria-hidden className="size-4 text-primary" />
              {t("review.checksTitle")}
            </h2>
            {prospect.issues.length ? (
              <>
                <p className="mt-4 flex items-center gap-2 text-error text-sm">
                  <AlertCircleIcon aria-hidden className="size-4 shrink-0" />
                  {t("review.blocked")}
                </p>
                <ul className="mt-4 list-disc space-y-3 pl-4 text-foreground-dimmed text-sm">
                  {prospect.issues.map((issue) => (
                    <li key={`${issue.code}-${issue.field}`}>
                      {Object.entries(issueLabels).find(
                        ([key]) => key === issue.code,
                      )?.[1] ?? issue.code}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 flex items-start gap-2 text-sm text-success">
                <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t(
                  playbook.automationEnabled
                    ? "review.automaticReady"
                    : "review.ready",
                )}
              </p>
            )}
          </section>
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {t(
              playbook.automationEnabled
                ? "review.automaticApprovalNote"
                : "review.approvalNote",
            )}{" "}
            {t("review.notSending")}
          </p>
          <Button
            variant={playbook.automationEnabled ? "soft" : undefined}
            disabled={
              mutation.pending ||
              dirty ||
              prospect.issues.length > 0 ||
              ["approved", "active"].includes(prospect.status)
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
            {t(
              playbook.automationEnabled
                ? "review.manualApproval"
                : "review.action.primary",
            )}
          </Button>
          <InferredForm
            config={{
              reason: field({
                shape: "text",
                validator: z.string().max(2000),
                label: t("review.fields.reason"),
              }),
            }}
            defaultValues={{ reason: prospect.holdReason }}
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
            variant="ghost"
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
        </aside>
      </div>
    </div>
  );
};
