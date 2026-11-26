"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  LinkedinIcon,
} from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  LINKEDIN_STATUSES,
  type Playbook,
  type Prospect,
} from "@/lib/outbound";
import {
  renderLinkedInResult,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import { copyVerdictProblem } from "@/lib/outbound-copy-quality";
import * as Outbound from "@/server/app/outbound";
import {
  Multiline,
  Notice,
  Submit,
  useMutation,
} from "../../../_components/common";

export const LinkedInEditor = ({
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
  const labels = messages.outbound.linkedin.status;
  const mutation = useMutation();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const writing = writingSnapshotSchema.safeParse(
    prospect.messages[0]?.writing,
  );
  const rendered =
    writing.success && !copyVerdictProblem(writing.data.quality)
      ? renderLinkedInResult(prospect, playbook, writing.data.parts)
      : null;
  const initialDraft =
    prospect.linkedinDraft ||
    (rendered?.status === "ready" ? rendered.text : "");
  const initial = {
    status: prospect.linkedinStatus,
    draft: initialDraft,
    nextActionAt: prospect.linkedinNextActionAt ?? "",
    note: prospect.linkedinNote,
  };
  const [draft, setDraft] = useState(initialDraft);
  const [copyError, setCopyError] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-w-0">
      <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
        <Button
          variant="outline"
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
          {t("linkedin.queue.action.secondary")}
        </Button>
        <AlertDialog open={leaving} onOpenChange={setLeaving}>
          <AlertDialogPopup>
            <AlertDialogTitle>
              {t("linkedin.queue.discard.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("linkedin.queue.discard.description")}
            </AlertDialogDescription>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialogClose
                render={<Button variant="outline" color="neutral" />}
              >
                {t("linkedin.queue.discard.action.secondary")}
              </AlertDialogClose>
              <Button onClick={() => router.push(backHref)}>
                {t("linkedin.queue.discard.action.primary")}
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
          <p className="mt-2 break-words text-foreground-dimmed text-sm">
            {prospect.name}
            {prospect.title ? ` · ${prospect.title}` : ""}
          </p>
        </div>
        <Button
          variant="soft"
          color="neutral"
          render={
            <a href={prospect.linkedinUrl} target="_blank" rel="noreferrer" />
          }
        >
          <LinkedinIcon aria-hidden className="size-4" />
          {t("linkedin.action.secondary")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          className="min-w-0"
          inert={mutation.pending}
          aria-busy={mutation.pending}
        >
          <InferredForm
            config={{
              status: field({
                shape: "select",
                validator: z.enum(LINKEDIN_STATUSES),
                label: t("linkedin.fields.status"),
                items: LINKEDIN_STATUSES.map((value) => ({
                  value,
                  label: labels[value],
                })),
              }),
              draft: field({
                shape: "custom",
                Component: Multiline,
                validator: z.string().max(4000),
                label: t("linkedin.fields.draft"),
                description:
                  !prospect.linkedinDraft && rendered?.status !== "ready"
                    ? t("linkedin.missingTemplateDetails")
                    : undefined,
              }),
              nextActionAt: field({
                shape: "text",
                validator: z.string(),
                label: t("linkedin.fields.nextDate"),
                description: t("prospect.dateHelp"),
              }),
              note: field({
                shape: "custom",
                Component: Multiline,
                validator: z.string().max(5000),
                label: t("linkedin.fields.notes"),
              }),
            }}
            defaultValues={initial}
            onChange={(values) => {
              setDirty(
                Object.entries(initial).some(
                  ([key, value]) =>
                    values[key as keyof typeof initial] !== value,
                ),
              );
              setDraft(values.draft ?? "");
              setCopied(false);
              setCopyError(false);
            }}
            onSubmit={(values) =>
              mutation.run(
                () =>
                  Outbound.updateLinkedIn({ prospect: prospect.id, ...values }),
                () => setDirty(false),
              )
            }
            className="min-w-0 space-y-6 px-4 py-6 sm:px-6"
          >
            <div className="flex flex-wrap gap-4">
              <Submit pending={mutation.pending}>
                {t("linkedin.action.primary")}
              </Submit>
              <Button
                type="button"
                variant="soft"
                color="neutral"
                disabled={!draft.trim()}
                onClick={async () => {
                  const result = await resultify(() =>
                    navigator.clipboard.writeText(draft),
                  );
                  setCopied(result.success);
                  setCopyError(!result.success);
                }}
              >
                {copied ? (
                  <CheckIcon aria-hidden className="size-4" />
                ) : (
                  <CopyIcon aria-hidden className="size-4" />
                )}
                {copied
                  ? t("common.copySuccess")
                  : t("linkedin.action.tertiary")}
              </Button>
            </div>
            {copyError && (
              <p role="alert" className="text-error text-sm">
                {t("common.copyError")}
              </p>
            )}
            <Notice value={mutation.notice} />
          </InferredForm>
        </div>
        <aside className="border-accent-foreground border-t px-4 py-6 sm:px-6 xl:border-t-0 xl:border-l">
          <p className="text-foreground-dimmed text-sm leading-6">
            {t("linkedin.manualNote")}
          </p>
        </aside>
      </div>
    </div>
  );
};
