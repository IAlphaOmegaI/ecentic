"use client";

import { ArrowRightIcon, ShieldCheckIcon } from "@zenncore/icons";
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
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { splitList } from "@/lib/outbound";
import { type DomainReadiness, warmupPlanSchema } from "@/lib/outbound-warmup";
import type * as WarmupModel from "@/server/app/outbound/warmup";
import * as Warmup from "@/server/app/outbound/warmup-actions";
import { Empty, Notice, useMutation } from "../../_components/common";

type MailboxRow = WarmupModel.MailboxReadinessRow & { _id: string };
const column = createColumnHelper<MailboxRow>();

export const MailboxList = ({
  mailboxes,
}: {
  mailboxes: WarmupModel.MailboxReadinessRow[];
}) => {
  const t = useTranslations("outbound.warmup");
  const format = useFormatter();
  const columns = [
    column.accessor("email", {
      header: t("email"),
      meta: { className: "w-1/3 min-w-56" },
      cell: ({ getValue }) => (
        <Link
          href={`/warmup/${encodeURIComponent(getValue())}`}
          className="block truncate font-medium text-foreground-rich underline-offset-4 hover:underline"
        >
          {getValue()}
        </Link>
      ),
    }),
    column.accessor("active", {
      header: t("senderPool"),
      cell: ({ getValue }) => t(getValue() ? "active" : "inactive"),
    }),
    column.accessor("connected", {
      header: t("connection"),
      cell: ({ getValue }) =>
        t(getValue() ? "connectionSaved" : "notConnected"),
    }),
    column.display({
      id: "checks",
      header: t("checks"),
      cell: ({ row }) => (
        <div className="space-y-2">
          <p>
            {row.original.check
              ? t(`readiness.${row.original.check.report.status}`)
              : t("unchecked")}
          </p>
          {row.original.check && (
            <p className="text-foreground-dimmed text-xs">
              {format.dateTime(new Date(row.original.check.checkedAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      ),
    }),
    column.display({
      id: "manage",
      header: "",
      meta: { className: "w-40" },
      cell: ({ row }) => (
        <Button
          variant="soft"
          color="neutral"
          render={
            <Link href={`/warmup/${encodeURIComponent(row.original.email)}`} />
          }
        >
          {t("manage")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      ),
    }),
  ];
  return (
    <>
      <section className="flex flex-wrap items-start justify-between gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="font-semibold text-foreground-rich text-xl">
            {t("mailboxesTitle")}
          </h2>
          <p className="mt-2 text-foreground-dimmed text-sm leading-6">
            {t("scopeHelp")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/playbook" />}
          >
            {t("addMailboxes")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/integrations" />}
          >
            {t("connectMailboxes")}
          </Button>
        </div>
      </section>
      <DataTableProvider
        rows={mailboxes.map((row) => ({ ...row, _id: row.email }))}
        columns={columns}
        handler="client"
        pageSize={25}
      >
        <div className="max-w-full overflow-x-auto">
          <DataTable
            className="min-w-200 table-fixed"
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
        {mailboxes.length > 25 && (
          <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
            <DataTablePagination
              variant="soft"
              labels={{
                navigation: t("pagination"),
                page: (page, pages) => t("page", { page, pages }),
                firstPage: t("firstPage"),
                previousPage: t("previousPage"),
                nextPage: t("nextPage"),
                lastPage: t("lastPage"),
              }}
            />
          </div>
        )}
      </DataTableProvider>
    </>
  );
};

const DnsRecords = ({ domain }: { domain: DomainReadiness }) => {
  const t = useTranslations("outbound.warmup");
  return (
    <dl className="divide-y divide-accent-foreground">
      {(["mx", "spf", "dkim", "dmarc"] as const).map((key) => (
        <div
          key={key}
          className="grid gap-2 py-4 sm:grid-cols-[8rem_minmax(0,1fr)]"
        >
          <dt className="font-medium text-foreground-rich text-sm">
            {t(`checkLabels.${key}`)}
          </dt>
          <dd className="min-w-0 space-y-2 text-foreground-dimmed text-sm">
            <p>{t(`states.${domain[key].state}`)}</p>
            {[...new Set(domain[key].records)].map((record) => (
              <code
                key={`${key}-${record}`}
                className="block break-all text-xs leading-5"
              >
                {record}
              </code>
            ))}
            {key === "dkim" && (
              <p>
                {t("selectorReceipt", {
                  selectors: domain.dkim.selectors.join(", ") || t("none"),
                })}
              </p>
            )}
            {key === "dmarc" && (
              <p>{t("recordDomain", { domain: domain.dmarc.recordDomain })}</p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export const MailboxControls = ({
  mailbox,
}: {
  mailbox: WarmupModel.MailboxReadinessRow;
}) => {
  const t = useTranslations("outbound.warmup");
  const format = useFormatter();
  const checking = useMutation();
  const saving = useMutation();
  const [validation, setValidation] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  return (
    <>
      <section className="space-y-2 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <h2 className="break-all font-semibold text-2xl text-foreground-rich">
          {mailbox.email}
        </h2>
        <p className="text-foreground-dimmed text-sm">
          {t(mailbox.active ? "active" : "inactive")} ·{" "}
          {t(mailbox.connected ? "connectionSaved" : "notConnected")}
        </p>
      </section>
      <Accordion
        multiple
        defaultValue={["checks", "plan"]}
        className="px-4 sm:px-6"
      >
        <AccordionItem value="checks">
          <AccordionTrigger className="py-6 text-base">
            {t("checksTitle")}
          </AccordionTrigger>
          <AccordionPanel
            keepMounted
            className="duration-200 motion-reduce:transition-none"
          >
            <div className="space-y-6 pb-6">
              <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
                {t("checkHelp")}
              </p>
              <InferredForm
                config={{
                  selectors: field({
                    shape: "text",
                    validator: z.string().trim().max(1000),
                    label: t("dkimSelectors"),
                    description: t("dkimHelp"),
                  }),
                }}
                defaultValues={{ selectors: mailbox.dkimSelectors.join(", ") }}
                className="max-w-2xl space-y-4"
                onSubmit={({ selectors }) =>
                  checking.run(() =>
                    Warmup.checkMailbox({
                      email: mailbox.email,
                      dkimSelectors: splitList(selectors),
                    }),
                  )
                }
              >
                <Button type="submit" disabled={checking.pending}>
                  <ShieldCheckIcon aria-hidden className="size-4" />
                  {t(checking.pending ? "checking" : "checkAction")}
                </Button>
                <Notice value={checking.notice} />
              </InferredForm>
              {mailbox.check ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground-rich">
                      {t(`readiness.${mailbox.check.report.status}`)}
                    </h3>
                    <p className="mt-2 text-foreground-dimmed text-xs">
                      {t("checkedAt", {
                        date: format.dateTime(
                          new Date(mailbox.check.checkedAt),
                          { dateStyle: "medium", timeStyle: "short" },
                        ),
                      })}
                    </p>
                  </div>
                  <dl className="grid gap-x-8 sm:grid-cols-2">
                    {mailbox.check.report.checks.map((check) => (
                      <div
                        key={check.key}
                        className="flex items-center justify-between gap-4 border-accent-foreground border-b py-4"
                      >
                        <dt className="text-sm">
                          {t(`checkLabels.${check.key}`)}
                        </dt>
                        <dd className="text-foreground-dimmed text-sm">
                          {t(`states.${check.state}`)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-foreground-dimmed text-sm leading-6">
                    {t("scopeHelp")}
                  </p>
                  <Accordion>
                    <AccordionItem value="records" className="border-b-0">
                      <AccordionTrigger className="py-4 text-sm">
                        {t("dnsRecords")}
                      </AccordionTrigger>
                      <AccordionPanel keepMounted>
                        <DnsRecords domain={mailbox.check.domain} />
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : (
                <p className="text-foreground-dimmed text-sm">
                  {t("uncheckedHelp")}
                </p>
              )}
            </div>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="plan" className="border-b-0">
          <AccordionTrigger className="py-6 text-base">
            {t("planTitle")}
          </AccordionTrigger>
          <AccordionPanel
            keepMounted
            className="duration-200 motion-reduce:transition-none"
          >
            <div className="space-y-6 pb-6">
              <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
                {t("planHelp")}
              </p>
              <InferredForm
                key={JSON.stringify(mailbox.plan)}
                config={{
                  initialDailyCap: field({
                    shape: "number",
                    validator: z.number().int().min(1).max(15),
                    label: t("initialDailyCap"),
                  }),
                  dailyIncrease: field({
                    shape: "number",
                    validator: z.number().int().min(0).max(5),
                    label: t("dailyIncrease"),
                  }),
                  maximumDailyCap: field({
                    shape: "number",
                    validator: z.number().int().min(1).max(15),
                    label: t("maximumDailyCap"),
                  }),
                }}
                defaultValues={{
                  initialDailyCap: mailbox.plan.initialDailyCap,
                  dailyIncrease: mailbox.plan.dailyIncrease,
                  maximumDailyCap: mailbox.plan.maximumDailyCap,
                }}
                className="grid max-w-4xl gap-6 sm:grid-cols-3"
                onSubmit={(values) => {
                  const plan = resultify(() =>
                    warmupPlanSchema.parse({ ...values, enabled: false }),
                  );
                  if (!plan.success) {
                    setValidation({ error: true, text: t("invalidPlan") });
                    return;
                  }
                  setValidation(null);
                  return saving.run(() =>
                    Warmup.savePlan({
                      email: mailbox.email,
                      plan: { ...plan.data, enabled: false },
                    }),
                  );
                }}
              >
                <div className="space-y-4 sm:col-span-3">
                  <Button type="submit" disabled={saving.pending}>
                    {t(saving.pending ? "saving" : "savePlan")}
                  </Button>
                  <Notice value={validation || saving.notice} />
                </div>
              </InferredForm>
              <div className="grid gap-6 border-accent-foreground border-y py-6 sm:grid-cols-2">
                <div>
                  <p className="text-foreground-dimmed text-sm">
                    {t("planStatus")}
                  </p>
                  <p className="mt-2 font-semibold text-foreground-rich">
                    {t("planningOnly")}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-dimmed text-sm">
                    {t("previewCap")}
                  </p>
                  <p className="mt-2 font-semibold text-foreground-rich tabular-nums">
                    {t("messagesPerDay", { count: mailbox.preview.dailyCap })}
                  </p>
                </div>
              </div>
              <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
                {t("planScope")}
              </p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};
