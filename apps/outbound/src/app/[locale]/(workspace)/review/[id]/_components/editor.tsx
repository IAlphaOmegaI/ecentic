"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  ClockIcon,
  FileSearchIcon,
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
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import {
  Sheet,
  SheetDescription,
  SheetPopup,
  SheetTitle,
} from "@zenncore/web/components/sheet";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import { countWords, deliveredBody, type Message } from "@/lib/outbound";
import { copyVerdictProblem } from "@/lib/outbound-copy-quality";
import {
  type ReviewContext,
  reviewChecks,
  reviewNextAction,
  reviewResearchOutcome,
} from "@/lib/outbound-review-context";
import * as Outbound from "@/server/app/outbound";
import * as CopyActions from "@/server/app/outbound/copy-actions";
import * as ReviewData from "@/server/app/outbound/review-context";
import {
  Multiline,
  Notice,
  Status,
  Submit,
  useMutation,
} from "../../../_components/common";

export const SentMessage = ({ value }: { value?: string | null }) => (
  <div className="whitespace-pre-wrap break-words rounded-lg bg-background p-4 font-body text-sm leading-6">
    {value}
  </div>
);

const MessagePreview = ({
  message,
  first,
  postalAddress,
}: {
  message: Message;
  first: Message | null;
  postalAddress: string;
}) => {
  const t = useTranslations("outbound");
  const title =
    message.step === 1
      ? "review.first"
      : message.step === 2
        ? "review.followupOne"
        : "review.followupTwo";
  return (
    <article className="min-w-0 space-y-3 border-accent-foreground border-b py-6 last:border-b-0">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-foreground-rich text-sm">
          {t(title)}
        </h3>
        <span className="text-foreground-dimmed text-xs tabular-nums">
          {t("review.composition.words", {
            count: String(countWords(message.body)),
          })}
        </span>
      </header>
      <p className="break-words font-medium text-sm">{message.subject}</p>
      <p className="whitespace-pre-wrap break-words font-body text-sm leading-6">
        {message.body}
      </p>
      <Accordion>
        <AccordionItem value="delivery" className="border-0">
          <AccordionTrigger className="text-foreground-dimmed text-xs">
            {t("review.composition.delivery")}
          </AccordionTrigger>
          <AccordionPanel>
            <div className="whitespace-pre-wrap break-words border-accent-foreground border-l-2 py-2 pl-4 text-foreground-dimmed text-xs leading-6">
              {deliveredBody(message, first ?? message, postalAddress)}
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <p className="break-words text-foreground-dimmed text-xs">
        {postalAddress}
      </p>
    </article>
  );
};

export const ReviewEditor = ({
  context,
  backHref,
  onChanged,
  onDirtyChange,
}: ReviewEditor.Props) => {
  const { prospect, playbook, research, previous } = context;
  const t = useTranslations("outbound");
  const messages = useMessages();
  const format = useFormatter();
  const router = useRouter();
  const mutation = useMutation();
  const [noticeLocation, setNoticeLocation] = useState<
    "review" | "draft" | "controls"
  >("review");
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [compare, setCompare] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answer, setAnswer] = useState<{
    text: string;
    citations: string[];
  } | null>(null);
  const [answerError, setAnswerError] = useState(false);
  const [answerPending, startAnswer] = useTransition();
  const checks = reviewChecks(context);
  const next = reviewNextAction(context);
  const writing = prospect.messages[0]?.writing;
  const copyProblem = copyVerdictProblem(writing?.quality);
  const labelForIssue = (code: string) =>
    Object.entries(messages.outbound.issues).find(
      ([key]) => key === code,
    )?.[1] ?? t("review.panel.unknownIssue");
  const hold = prospect.holdReason
    ? (Object.entries(messages.outbound.automation.reasons).find(
        ([key]) => key === prospect.holdReason,
      )?.[1] ??
      (prospect.holdReason === "playbookChanged"
        ? t("review.panel.playbookChanged")
        : /\s/.test(prospect.holdReason)
          ? prospect.holdReason
          : t("review.panel.systemHold")))
    : copyProblem
      ? `Copy: ${copyProblem}`
      : prospect.issues[0]
        ? labelForIssue(prospect.issues[0].code)
        : null;
  const updateDirty = (value: boolean) => {
    setDirty(value);
    onDirtyChange?.(value);
  };
  const run = (
    operation: Parameters<typeof mutation.run>[0],
    location: typeof noticeLocation = "review",
  ) => {
    setNoticeLocation(location);
    return mutation.run(operation, async () => {
      updateDirty(false);
      setEditing(false);
      await onChanged?.();
    });
  };
  const loadAnswer = () => {
    setAnswerOpen(true);
    if (answer) return;
    startAnswer(async () => {
      setAnswerError(false);
      try {
        const result = await ReviewData.readSavedAnswer({
          prospectId: prospect.id,
          revision: prospect.revision,
        });
        if (result.success && result.data) setAnswer(result.data);
        else setAnswerError(true);
      } catch {
        setAnswerError(true);
      }
    });
  };
  const outcome = reviewResearchOutcome(research);
  const formConfig = {
    subject: field({
      shape: "text",
      validator: z.string().trim().min(1).max(200),
      label: t("review.fields.subject"),
    }),
    opening: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().min(1).max(1200),
      label: t("review.composition.opening"),
    }),
    result: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().min(1).max(1600),
      label: t("review.composition.result"),
    }),
    relevance: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().min(1).max(1400),
      label: t("review.composition.relevance"),
    }),
    followupFact: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().max(1200),
      label: t("review.composition.followupFact"),
    }),
  };
  return (
    <div className="min-w-0">
      {backHref && (
        <div className="px-4 pt-4 sm:px-6">
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={backHref} />}
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                setLeaving(true);
              }
            }}
          >
            <ArrowLeftIcon aria-hidden />
            {t("review.queue.action.secondary")}
          </Button>
        </div>
      )}
      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogPopup>
          <AlertDialogTitle>{t("review.queue.discard.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("review.queue.discard.description")}
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogClose
              render={<Button variant="soft" color="neutral" />}
            >
              {t("review.queue.discard.action.secondary")}
            </AlertDialogClose>
            <Button
              onClick={() => {
                if (backHref) router.push(backHref);
              }}
            >
              {t("review.queue.discard.action.primary")}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
      <header className="flex flex-wrap items-start justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="min-w-0">
          <Link
            href={`/prospects/${prospect.id}`}
            className="break-words font-heading font-semibold text-2xl text-foreground-rich hover:text-primary-text"
          >
            {prospect.company}
          </Link>
          <p className="mt-2 break-words text-foreground-dimmed text-sm">
            {prospect.name} · {prospect.email}
          </p>
          <p className="mt-2 break-words text-foreground-dimmed text-xs">
            {playbook.fromName} · {prospect.senderEmail}
          </p>
        </div>
        <Status value={prospect.status} />
      </header>
      <section
        className="space-y-4 border-accent-foreground border-b px-4 py-5 sm:px-6"
        aria-label={t("review.composition.why")}
      >
        <h2 className="flex items-center gap-2 font-semibold text-sm">
          <FileSearchIcon aria-hidden className="size-4 text-primary" />
          {t("review.composition.why")}
        </h2>
        {research?.query && (
          <div>
            <p className="text-foreground-dimmed text-xs">
              {t("review.composition.query")}
            </p>
            <p className="mt-1 break-words font-medium text-sm">
              “{research.query}”
            </p>
          </div>
        )}
        <p className="text-sm leading-6">
          {outcome === "ranked"
            ? t("review.composition.ranked", {
                position: String(research?.position ?? "—"),
                total: String(research?.total ?? "—"),
              })
            : t(`review.composition.${outcome}`)}
        </p>
        {research?.listed.length ? (
          <p className="break-words text-foreground-dimmed text-sm">
            <span className="font-medium">
              {t("review.composition.listed")}:{" "}
            </span>
            {research.listed.join(", ")}
          </p>
        ) : null}
        {research && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-foreground-dimmed text-xs">
              {t("review.composition.checked", {
                date: format.dateTime(new Date(research.checkedAt), {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }),
              })}
            </span>
            <Button
              variant="outline"
              color="neutral"
              disabled={!research.fullAnswerAvailable}
              onClick={loadAnswer}
            >
              {t("review.composition.openAnswer")}
            </Button>
          </div>
        )}
      </section>
      <section className="space-y-4 border-accent-foreground border-b bg-background px-4 py-5 sm:px-6">
        <div className="flex flex-wrap gap-3">
          {(["contact", "research", "copy"] as const).map((kind) => (
            <span
              key={kind}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                checks[kind] === "ready"
                  ? "border-success/30 text-success"
                  : "border-warning/30 text-foreground-rich",
              )}
            >
              {checks[kind] === "ready" ? (
                <CheckIcon aria-hidden className="size-3.5" />
              ) : (
                <AlertCircleIcon aria-hidden className="size-3.5" />
              )}
              {t(`review.composition.${kind}`)}:{" "}
              {t(`review.composition.${checks[kind]}`)}
            </span>
          ))}
        </div>
        {context.proposal && (
          <div className="space-y-1">
            <p className="font-medium text-primary-text text-xs">
              {t("review.composition.proposal")}
            </p>
            <p className="text-foreground-dimmed text-sm">
              {t("review.composition.proposalNote")}
            </p>
          </div>
        )}
        {hold && (
          <p role="status" className="break-words text-sm leading-6">
            {hold}
          </p>
        )}
        {prospect.status === "held" && (
          <p className="text-foreground-dimmed text-xs">
            {t("review.composition.sameHold")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {next === "regenerate" ? (
            writing && context.copyEditable ? (
              <Button
                variant="soft"
                disabled={mutation.pending}
                onClick={() => setEditing(true)}
              >
                {t("review.composition.edit")}
              </Button>
            ) : prospect.sentStep === 0 ? (
              <Button
                variant="soft"
                disabled={mutation.pending || dirty}
                onClick={() =>
                  run(() =>
                    context.prospect.status === "held"
                      ? CopyActions.previewRebuild({
                          prospect: prospect.id,
                          revision: prospect.revision,
                        })
                      : Outbound.generateDrafts({ prospect: prospect.id }),
                  )
                }
              >
                {t("review.composition.regenerate")}
              </Button>
            ) : null
          ) : (
            <Button
              variant="soft"
              color="neutral"
              render={<Link href={`/prospects/${prospect.id}`} />}
            >
              {t(`review.composition.${next}`)}
            </Button>
          )}
          {!context.proposal &&
            prospect.status === "draft" &&
            Object.values(checks).every((value) => value === "ready") && (
              <Button
                disabled={
                  mutation.pending || dirty || prospect.issues.length > 0
                }
                onClick={() =>
                  run(() =>
                    Outbound.reviewProspect({
                      prospect: prospect.id,
                      revision: prospect.revision,
                      decision: "approve",
                    }),
                  )
                }
              >
                <CheckIcon aria-hidden />
                {t("review.action.primary")}
              </Button>
            )}
        </div>
        <Notice value={noticeLocation === "review" ? mutation.notice : null} />
      </section>
      {writing?.quality && (
        <Accordion className="border-accent-foreground border-b px-4 sm:px-6">
          <AccordionItem value="quality" className="border-0">
            <AccordionTrigger className="text-sm">
              {t("review.composition.copyChecks")}
            </AccordionTrigger>
            <AccordionPanel>
              <ul className="space-y-3 pb-5">
                {writing.quality.criteria.map((check) => (
                  <li
                    key={check.criterion}
                    className="flex gap-2 text-sm leading-6"
                  >
                    {check.passed ? (
                      <CheckIcon
                        aria-label={t("review.composition.ready")}
                        className="mt-1 size-4 shrink-0 text-success"
                      />
                    ) : (
                      <AlertCircleIcon
                        aria-label={t("review.composition.attention")}
                        className="mt-1 size-4 shrink-0 text-warning"
                      />
                    )}
                    <span>{check.reason}</span>
                  </li>
                ))}
              </ul>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
      {editing && writing && context.copyEditable && (
        <section className="space-y-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
          <h2 className="font-semibold">{t("review.composition.edit")}</h2>
          <p className="text-foreground-dimmed text-sm">
            {t("review.composition.unchangedVerdict")}
          </p>
          <InferredForm
            config={formConfig}
            defaultValues={writing.parts}
            onChange={(values) =>
              updateDirty(
                Object.entries(writing.parts).some(
                  ([key, value]) =>
                    values[key as keyof typeof writing.parts] !== value,
                ),
              )
            }
            onSubmit={(parts) =>
              run(
                () =>
                  CopyActions.saveWriterParts({
                    prospect: prospect.id,
                    revision: prospect.revision,
                    parts,
                  }),
                "draft",
              )
            }
            className="space-y-5"
          >
            <Submit pending={mutation.pending}>
              {t("review.composition.saveCheck")}
            </Submit>
            <Notice
              value={noticeLocation === "draft" ? mutation.notice : null}
            />
          </InferredForm>
        </section>
      )}
      <section className="min-w-0 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-sm">
            {t("review.composition.current")} ·{" "}
            {t("review.composition.revision", {
              revision: String(prospect.revision),
            })}
          </h2>
          {previous && (
            <Button
              variant="ghost"
              color="neutral"
              onClick={() => setCompare(!compare)}
            >
              {t(
                compare
                  ? "review.composition.hidePrevious"
                  : "review.composition.compare",
              )}
            </Button>
          )}
        </div>
        <div
          className={cn(
            "min-w-0",
            compare && previous && "grid gap-8 xl:grid-cols-2",
          )}
        >
          <div className="min-w-0">
            {prospect.messages.length ? (
              prospect.messages.map((message) => (
                <MessagePreview
                  key={message.step}
                  message={message}
                  first={
                    prospect.sentFirstMessage ?? prospect.messages[0] ?? null
                  }
                  postalAddress={
                    prospect.sentPostalAddress ?? playbook.postalAddress
                  }
                />
              ))
            ) : (
              <p className="py-8 text-foreground-dimmed text-sm">
                {t("review.composition.noDraft")}
              </p>
            )}
          </div>
          {compare && previous && (
            <div className="min-w-0 border-accent-foreground border-t pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
              <h2 className="mt-6 font-semibold text-sm">
                {t("review.composition.previous")} ·{" "}
                {t("review.composition.revision", {
                  revision: String(previous.revision),
                })}
              </h2>
              {previous.messages.map((message) => (
                <MessagePreview
                  key={message.step}
                  message={message}
                  first={previous.messages[0] ?? null}
                  postalAddress={previous.postalAddress}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
        <Accordion>
          <AccordionItem value="controls" className="border-0">
            <AccordionTrigger className="text-sm">
              {t("review.panel.controls")}
            </AccordionTrigger>
            <AccordionPanel>
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
                  run(
                    () =>
                      Outbound.reviewProspect({
                        prospect: prospect.id,
                        revision: prospect.revision,
                        decision: "hold",
                        reason,
                      }),
                    "controls",
                  )
                }
                className="space-y-4 py-4"
              >
                <Button
                  type="submit"
                  variant="soft"
                  color="neutral"
                  disabled={mutation.pending}
                >
                  <ClockIcon aria-hidden />
                  {t("review.action.tertiary")}
                </Button>
                <Notice
                  value={noticeLocation === "controls" ? mutation.notice : null}
                />
              </InferredForm>
              <Button
                variant="soft"
                color="error"
                disabled={mutation.pending || dirty}
                onClick={() =>
                  run(
                    () =>
                      Outbound.recordOutcome({
                        prospect: prospect.id,
                        kind: "optout",
                        note: "Staff marked do not contact",
                      }),
                    "controls",
                  )
                }
              >
                <BanIcon aria-hidden />
                {t("review.action.quaternary")}
              </Button>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>
      <Sheet open={answerOpen} onOpenChange={setAnswerOpen}>
        <SheetPopup
          side="right"
          closeLabel={t("review.composition.close")}
          className="h-dvh max-h-dvh w-full max-w-full overflow-y-auto bg-background-rich p-6 sm:w-3xl sm:max-w-3xl"
        >
          <SheetTitle className="pr-10">
            {t("review.composition.answerTitle")}
          </SheetTitle>
          <SheetDescription>{research?.query}</SheetDescription>
          {answerPending && (
            <p role="status" className="py-6 text-sm">
              {t("review.composition.loading")}
            </p>
          )}
          {answerError && (
            <p role="alert" className="py-6 text-error text-sm">
              {t("review.composition.answerUnavailable")}
            </p>
          )}
          {answer && (
            <div className="space-y-6 py-6">
              <pre className="whitespace-pre-wrap break-words font-body text-sm leading-6">
                {answer.text}
              </pre>
              {answer.citations.length > 0 && (
                <Accordion>
                  <AccordionItem value="citations">
                    <AccordionTrigger>
                      {t("review.composition.citations")}
                    </AccordionTrigger>
                    <AccordionPanel>
                      <div className="space-y-4">
                        {[...new Set(answer.citations)].map((citation) => (
                          <p
                            key={citation}
                            className="whitespace-pre-wrap break-words text-xs leading-6"
                          >
                            {citation}
                          </p>
                        ))}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          )}
        </SheetPopup>
      </Sheet>
    </div>
  );
};

export namespace ReviewEditor {
  export type Props = {
    context: ReviewContext;
    backHref?: string;
    onChanged?: () => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };
}
