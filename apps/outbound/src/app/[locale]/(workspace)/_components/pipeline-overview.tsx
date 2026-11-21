import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as Outbound from "@/server/app/outbound";
import * as Automation from "@/server/app/outbound/automation-actions";
import * as Pipeline from "@/server/app/outbound/pipeline-actions";
import { Environment } from "@/server/utils/environment";
import { AutomationPanel, AutomationSkeleton } from "./automation";
import { PipelineRefresh } from "./pipeline-refresh";
import { ReportPanel } from "./report";
import { WorkspaceSkeleton } from "./skeletons";
import { Empty } from "./status";

export const PipelineOverview = async () => {
  const [t, navigation, automation, format, messages, result] =
    await Promise.all([
      getTranslations("outbound.pipeline"),
      getTranslations("outbound.nav"),
      getTranslations("outbound.automation"),
      getFormatter(),
      getMessages(),
      Pipeline.getOverview(Environment.SERVER),
    ]);
  if (!result.success)
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("error")}
      </p>
    );
  const data = result.data;
  const blockers = [
    ...(!data.setup.automationEnabled
      ? [{ label: t("automationHelp"), href: "/playbook" }]
      : []),
    ...(!data.setup.apolloConfigured
      ? [{ label: t("apolloMissing"), href: "/integrations" }]
      : []),
    ...(!data.setup.azureConfigured
      ? [{ label: t("azureMissing"), href: "/integrations" }]
      : []),
    ...(data.setup.linkedinEnabled && !data.setup.linkedinConnected
      ? [{ label: t("linkedinMissing"), href: "/integrations" }]
      : []),
    ...data.setup.deliveryBlockers.map((code) => ({
      label: Object.hasOwn(messages.outbound.automation.deliveryBlockers, code)
        ? messages.outbound.automation.deliveryBlockers[
            code as keyof typeof messages.outbound.automation.deliveryBlockers
          ]
        : automation("unknownReason"),
      href: [
        "sendingPaused",
        "senderUnconfirmed",
        "historyUnconfirmed",
        "competingSendersActive",
        "senderUntested",
      ].includes(code)
        ? "/playbook"
        : "/integrations",
    })),
  ];
  const metrics = [
    {
      key: "activeCampaigns",
      label: t("activeCampaigns"),
      value: data.totals.activeCampaigns,
      href: "/campaigns",
    },
    {
      key: "companies",
      label: t("companies"),
      value: data.totals.companies,
      href: "/campaigns",
    },
    {
      key: "needsReply",
      label: t("needsReply"),
      value: data.totals.needsReply,
      href: "/replies?needsReply=1",
    },
    {
      key: "meetings",
      label: t("meetings"),
      value: data.totals.meetings,
      href: "/replies",
    },
  ];
  const status = (stored: string) =>
    stored === "pending"
      ? "queued"
      : stored === "starting"
        ? "running"
        : stored === "failed"
          ? "held"
          : "uncertain";
  return (
    <>
      <div className="grid grid-cols-2 gap-px border-accent-foreground border-b bg-accent-foreground lg:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.key}
            href={metric.href}
            className="min-w-0 bg-background-rich px-4 py-5 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 sm:px-6"
          >
            <p className="font-medium text-foreground-dimmed text-sm">
              {metric.label}
            </p>
            <p className="mt-2 font-semibold text-4xl text-foreground-rich tabular-nums tracking-tight">
              {format.number(metric.value)}
            </p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <ClockIcon aria-hidden className="size-4 text-primary" />
            {t(data.setup.automationEnabled ? "automationOn" : "automationOff")}
          </span>
          {!data.setup.linkedinEnabled && (
            <span className="text-foreground-dimmed">{t("linkedinOff")}</span>
          )}
        </div>
        <PipelineRefresh />
      </div>
      <section className="border-accent-foreground border-b">
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <h2 className="font-semibold text-foreground-rich text-lg">
              {t("campaignsTitle")}
            </h2>
            <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm leading-6">
              {t("scopeHelp")}
            </p>
          </div>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/campaigns" />}
          >
            {t("openCampaigns")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
        {data.campaigns.length ? (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-160 border-b-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 sm:px-6">
                      {navigation("campaigns")}
                    </TableHead>
                    {(
                      [
                        "companies",
                        "insights",
                        "contacts",
                        "sequences",
                        "held",
                      ] as const
                    ).map((key) => (
                      <TableHead key={key} className="text-right">
                        {t(key)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="max-w-72 px-4 sm:px-6">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="block truncate font-medium text-primary-text"
                          title={campaign.name}
                        >
                          {campaign.name}
                        </Link>
                      </TableCell>
                      {(
                        [
                          "companies",
                          "insights",
                          "contacts",
                          "sequences",
                          "held",
                        ] as const
                      ).map((key) => (
                        <TableCell
                          key={key}
                          className="text-right tabular-nums"
                        >
                          {format.number(campaign[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.totals.activeCampaigns > data.campaigns.length && (
              <p className="border-accent-foreground border-t px-4 py-3 text-foreground-dimmed text-sm sm:px-6">
                {t("moreCampaigns")}
              </p>
            )}
          </>
        ) : (
          <Empty title={t("emptyTitle")} description={t("emptyHelp")}>
            <Button
              variant="soft"
              color="neutral"
              render={<Link href="/campaigns/new" />}
            >
              {t("emptyAction")}
            </Button>
          </Empty>
        )}
      </section>
      <div className="grid border-accent-foreground border-b lg:grid-cols-2">
        <section className="border-accent-foreground border-b px-4 py-5 sm:px-6 lg:border-r lg:border-b-0">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {t("workTitle")}
          </h2>
          {data.work.length ? (
            <ol className="mt-3 divide-y divide-accent-foreground">
              {data.work.map((work) => (
                <li key={work.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      className="min-w-0 truncate font-medium text-primary-text text-sm"
                      href={`/campaigns/${work.campaignId}/companies/${work.companyId}`}
                    >
                      {work.company}
                    </Link>
                    <span className="shrink-0 text-foreground-dimmed text-xs">
                      {automation(`statuses.${status(work.status)}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground-dimmed text-sm">
                    {Object.hasOwn(
                      messages.outbound.automation.stages,
                      work.stage,
                    )
                      ? messages.outbound.automation.stages[
                          work.stage as keyof typeof messages.outbound.automation.stages
                        ]
                      : automation("unknownStage")}
                  </p>
                  {work.reason && (
                    <p className="mt-1 text-sm">
                      {Object.hasOwn(
                        messages.outbound.automation.reasons,
                        work.reason,
                      )
                        ? messages.outbound.automation.reasons[
                            work.reason as keyof typeof messages.outbound.automation.reasons
                          ]
                        : automation("unknownReason")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-foreground-dimmed text-sm leading-6">
              {t("workEmpty")}
            </p>
          )}
        </section>
        <section className="px-4 py-5 sm:px-6">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {t("setupTitle")}
          </h2>
          {blockers.length ? (
            <ul className="mt-3 divide-y divide-accent-foreground">
              {blockers.map((blocker) => (
                <li
                  key={blocker.label}
                  className="flex items-start gap-2 py-2.5 text-sm"
                >
                  <AlertCircleIcon
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-warning"
                  />
                  <Link
                    href={blocker.href}
                    className="leading-6 hover:text-primary-text"
                  >
                    {blocker.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-foreground-dimmed text-sm leading-6">
              <CheckCircleIcon
                aria-hidden
                className="mt-1 size-4 shrink-0 text-success"
              />
              {t("setupReady")}
            </p>
          )}
        </section>
      </div>
      <section className="border-accent-foreground border-b px-4 py-5 sm:px-6">
        <h2 className="font-semibold text-foreground-rich text-lg">
          {t("activityTitle")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link
            href="/replies?view=sent&channel=email"
            className="text-primary-text"
          >
            {t("emailAccepted")}:{" "}
            <span className="font-semibold tabular-nums">
              {format.number(data.totals.acceptedEmails)}
            </span>
          </Link>
          <Link
            href="/replies?view=sent&channel=linkedin"
            className="text-primary-text"
          >
            {t("linkedinAccepted")}:{" "}
            <span className="font-semibold tabular-nums">
              {format.number(data.totals.acceptedLinkedin)}
            </span>
          </Link>
        </div>
        <p className="mt-2 text-foreground-dimmed text-xs leading-5">
          {t("acceptedHelp")}
        </p>
        <p className="mt-1 text-foreground-dimmed text-xs leading-5">
          {t("meetingsHelp")}
        </p>
      </section>
      <Accordion className="px-4 sm:px-6">
        <AccordionItem value="automation" className="border-accent-foreground">
          <AccordionTrigger className="py-5">
            {t("detailsTitle")}
          </AccordionTrigger>
          <AccordionPanel className="[&>*]:border-b-0">
            <Suspense fallback={<AutomationSkeleton />}>
              <DetailedAutomation />
            </Suspense>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="report" className="border-0">
          <AccordionTrigger className="py-5">
            {t("reportTitle")}
          </AccordionTrigger>
          <AccordionPanel>
            <Suspense fallback={<WorkspaceSkeleton />}>
              <WeeklyReport />
            </Suspense>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};

const DetailedAutomation = async () => {
  const status = await Automation.getStatus(Environment.SERVER);
  return <AutomationPanel initial={status.success ? status.data : null} />;
};
const WeeklyReport = async () => {
  const report = await Outbound.getWeeklyReport(Environment.SERVER);
  return report.success ? <ReportPanel report={report.data} /> : null;
};
