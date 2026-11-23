"use client";

import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
  DataTableEmpty,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import * as Network from "@/server/app/outbound/warmbly-actions";
import type * as Warmup from "@/server/app/outbound/warmup";
import type { WarmblyMailbox } from "@/server/utils/outbound/warmbly";
import { Empty, Notice } from "../../_components/common";

export type NetworkSnapshot = {
  configured: boolean;
  mailboxes: WarmblyMailbox[];
  hasMore: boolean;
  nextCursor: string | null;
  pendingJobs: {
    id: string;
    email: string | null;
    action: string | null;
    status: string;
    error: string | null;
  }[];
};
type Row = WarmblyMailbox & { _id: string };
const column = createColumnHelper<Row>();

export const WarmblyNetworkPanel = ({
  initial,
  mailboxes,
  failed = false,
}: {
  initial: NetworkSnapshot | null;
  mailboxes: Warmup.MailboxReadinessRow[];
  failed?: boolean;
}) => {
  const t = useTranslations("outbound.warmbly");
  const messages = useMessages();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    failed ? { error: true, text: t("loadError") } : null,
  );
  const currentCursor = cursors.at(-1);
  const failureMessage = (error: unknown) => {
    const failure = z
      .object({ message: z.string(), code: z.string().optional() })
      .safeParse(error);
    const errors = messages.outbound.warmbly.errors;
    if (failure.success && Object.hasOwn(errors, failure.data.message))
      return errors[failure.data.message as keyof typeof errors];
    if (failure.success && failure.data.code === "access")
      return t("accessError");
    if (failure.success) {
      switch (failure.data.message) {
        case "Save a warmup plan and run a mailbox check before starting warmup.":
        case "Run a fresh mailbox check and resolve MX, SPF, DKIM and DMARC before starting warmup.":
          return t("readinessError");
        case "The warmup ceiling exceeds the Playbook or mailbox limit.":
          return t("limitError");
        case "The mailbox must be active in Warmbly before starting warmup.":
          return t("activeError");
        case "Warmbly has not confirmed the configured ramp. Refresh its status before retrying.":
          return t("rampError");
        case "The warmup plan changed during setup. Refresh before starting it.":
          return t("planChangedError");
        case "Warmbly has not confirmed the requested state. Refresh to reconcile it before retrying.":
          return t("stateError");
        case "Save this exact mailbox in the Playbook before managing its warmup.":
        case "This Warmbly mailbox is not registered in the Playbook.":
          return t("registeredError");
      }
    }
    return t("actionError");
  };
  const load = async (cursor?: string) => {
    const loaded = await Network.getNetwork(cursor ? { cursor } : {});
    if (!loaded.success) throw loaded.error;
    setSnapshot(loaded.data);
  };
  const run = async (operation: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setNotice(null);
    const result = await resultify(operation);
    setNotice({
      error: !result.success,
      text: result.success ? t("updated") : failureMessage(result.error),
    });
    running.current = false;
    setPending(false);
  };
  const eligible = (mailbox: WarmblyMailbox) => {
    const local = mailboxes.find((entry) => entry.email === mailbox.email);
    const checkedAt = Date.parse(local?.check?.checkedAt ?? "");
    return Boolean(
      local?.planSaved &&
        local.connected &&
        local.check?.connection === "verified" &&
        mailbox.status === "active" &&
        [
          local.check.domain.mx,
          local.check.domain.spf,
          local.check.domain.dkim,
          local.check.domain.dmarc,
        ].every((check) => check.state === "present") &&
        local.plan.maximumDailyCap <=
          Math.min(local.policyDailyCap, local.inboxDailyCap) &&
        Date.now() - checkedAt < 24 * 3600_000 &&
        checkedAt <= Date.now(),
    );
  };
  const control = (
    mailbox: WarmblyMailbox,
    action: "start" | "pause" | "resume" | "stop",
  ) =>
    run(async () => {
      const changed = await Network.control({ id: mailbox.id, action });
      if (!changed.success) throw changed.error;
      await load(currentCursor);
      router.refresh();
    });
  const columns = [
    column.accessor("email", {
      header: t("email"),
      meta: { className: "w-1/3 min-w-56" },
      cell: ({ getValue }) => (
        <span className="block truncate font-medium text-foreground-rich">
          {getValue() ?? t("unknown")}
        </span>
      ),
    }),
    column.accessor("state", {
      header: t("state"),
      cell: ({ getValue }) => t(`states.${getValue()}`),
    }),
    column.accessor("maximumDailyCap", {
      header: t("maximum"),
      cell: ({ getValue }) =>
        getValue() === null
          ? t("unknown")
          : t("perDay", { count: getValue() ?? 0 }),
    }),
    column.display({
      id: "actions",
      header: "",
      meta: { className: "min-w-72" },
      cell: ({ row }) => {
        const mailbox = row.original;
        const unresolved = snapshot?.pendingJobs.some(
          (job) => job.email === mailbox.email,
        );
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {mailbox.state === "off" && (
                <Button
                  disabled={pending || unresolved || !eligible(mailbox)}
                  onClick={() => control(mailbox, "start")}
                >
                  {t("actions.start")}
                </Button>
              )}
              {mailbox.state === "paused" && (
                <Button
                  disabled={pending || unresolved || !eligible(mailbox)}
                  onClick={() => control(mailbox, "resume")}
                >
                  {t("actions.resume")}
                </Button>
              )}
              {mailbox.state === "running" && (
                <Button
                  variant="soft"
                  color="neutral"
                  disabled={pending}
                  onClick={() => control(mailbox, "pause")}
                >
                  {t("actions.pause")}
                </Button>
              )}
              {["running", "paused", "unknown"].includes(mailbox.state) && (
                <Button
                  variant="soft"
                  color="error"
                  disabled={pending}
                  onClick={() => control(mailbox, "stop")}
                >
                  {t("actions.stop")}
                </Button>
              )}
              {mailbox.email && (
                <Button
                  variant="soft"
                  color="neutral"
                  render={
                    <Link
                      href={`/warmup/${encodeURIComponent(mailbox.email)}`}
                    />
                  }
                >
                  {t("mailboxChecks")}
                </Button>
              )}
            </div>
            {["off", "paused"].includes(mailbox.state) &&
              !eligible(mailbox) && (
                <p className="max-w-xs text-foreground-dimmed text-xs leading-5">
                  {t("checksRequired")}
                </p>
              )}
          </div>
        );
      },
    }),
  ];
  return (
    <section className="border-accent-foreground border-b" aria-busy={pending}>
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-semibold text-foreground-rich text-xl">
            {t("title")}
          </h2>
          <span className="rounded-sm bg-background-dimmed px-2 py-1 text-xs">
            {t(
              snapshot
                ? snapshot.configured
                  ? "connected"
                  : "notConnected"
                : failed
                  ? "unknown"
                  : "notConnected",
            )}
          </span>
        </div>
        <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="soft"
            color="neutral"
            render={
              <a
                href="https://app.warmbly.com"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            {t("openWarmbly")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
          <Button
            variant="soft"
            color="neutral"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await load();
                setCursors([undefined]);
                router.refresh();
              })
            }
          >
            {t("refresh")}
          </Button>
        </div>
        <Accordion defaultValue={snapshot?.configured ? [] : ["key"]}>
          <AccordionItem value="key" className="border-b-0">
            <AccordionTrigger className="py-4 text-sm">
              {t(snapshot?.configured ? "replaceKey" : "connectKey")}
            </AccordionTrigger>
            <AccordionPanel
              keepMounted
              className="duration-200 motion-reduce:transition-none"
            >
              <InferredForm
                config={{
                  apiKey: field({
                    shape: "text",
                    type: "password",
                    autoComplete: "off",
                    disabled: pending,
                    validator: z
                      .string()
                      .trim()
                      .regex(/^wmbly_[A-Za-z0-9_-]{43}$/, {
                        error: t("invalidKey"),
                      }),
                    label: t("apiKey"),
                    description: t("keyHelp"),
                    maskToggleLabels: {
                      show: t("showKey"),
                      hide: t("hideKey"),
                    },
                  }),
                }}
                defaultValues={{ apiKey: "" }}
                className="max-w-2xl space-y-4 pb-4"
                onSubmit={(values, form) =>
                  run(async () => {
                    const saved = await Network.saveKey(values);
                    if (!saved.success) throw saved.error;
                    form.reset({ apiKey: "" });
                    await load();
                    setCursors([undefined]);
                    router.refresh();
                  })
                }
              >
                <Button type="submit" disabled={pending}>
                  {t("saveKey")}
                </Button>
              </InferredForm>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        <Notice value={notice} />
        {snapshot?.configured && (
          <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
            {t("startHelp")}
          </p>
        )}
        {Boolean(snapshot?.pendingJobs.length) && (
          <div className="space-y-2">
            <p className="text-sm text-warning-foreground">
              {t("pendingHelp")}
            </p>
            <ul className="space-y-2 text-foreground-dimmed text-xs">
              {snapshot?.pendingJobs.map((job) => (
                <li key={job.id}>
                  {job.email ?? t("unknown")} · {t("pending")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {snapshot?.configured && (
        <>
          <DataTableProvider
            rows={snapshot.mailboxes.map((mailbox) => ({
              ...mailbox,
              _id: mailbox.id,
            }))}
            columns={columns}
            handler="client"
            pageSize={50}
          >
            <div className="max-w-full overflow-x-auto">
              <DataTable
                className="min-w-200 table-fixed border-b-0"
                classList={{
                  "header-cell":
                    "h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
                  "body-cell": "px-4 py-4 text-sm",
                  "body-row": "hover:bg-background/70",
                }}
              >
                <DataTableEmpty>
                  <Empty
                    title={t("emptyTitle")}
                    description={t("emptyDescription")}
                  />
                </DataTableEmpty>
              </DataTable>
            </div>
          </DataTableProvider>
          <div className="flex items-center justify-between gap-4 border-accent-foreground border-t px-4 py-4 sm:px-6">
            <p className="text-foreground-dimmed text-xs">
              {t("page", { page: cursors.length })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="soft"
                color="neutral"
                disabled={pending || cursors.length <= 1}
                onClick={() =>
                  run(async () => {
                    const previous = cursors.slice(0, -1);
                    await load(previous.at(-1));
                    setCursors(previous);
                  })
                }
              >
                <ChevronLeftIcon aria-hidden className="size-4" />
                {t("previous")}
              </Button>
              <Button
                variant="soft"
                color="neutral"
                disabled={pending || !snapshot.hasMore || !snapshot.nextCursor}
                onClick={() =>
                  run(async () => {
                    if (!snapshot.nextCursor) return;
                    await load(snapshot.nextCursor);
                    setCursors([...cursors, snapshot.nextCursor]);
                  })
                }
              >
                {t("next")}
                <ChevronRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
