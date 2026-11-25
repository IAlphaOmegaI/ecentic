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
import { Empty } from "./status";

export const PipelineOverview = async () => {
  const [translate, navigation, automation, format, messages, result] =
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
        {translate("error")}
      </p>
    );
  const data = result.data;
  const blockers = [
    ...(!data.setup.automationEnabled
      ? [{ label: translate("automationHelp"), href: "/playbook" }]
      : []),
    ...(!data.setup.apolloConfigured
      ? [{ label: translate("apolloMissing"), href: "/integrations" }]
      : []),
    ...(!data.setup.azureConfigured
      ? [{ label: translate("azureMissing"), href: "/integrations" }]
      : []),
    ...(data.setup.linkedinEnabled && !data.setup.linkedinConnected
      ? [{ label: translate("linkedinMissing"), href: "/integrations" }]
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
      label: translate("activeCampaigns"),
      value: data.totals.activeCampaigns,
      href: "/campaigns",
    },
    {
      key: "companies",
      label: translate("companies"),
      value: data.totals.companies,
      href: "/campaigns",
    },
    {
      key: "needsReply",
      label: translate("needsReply"),
      value: data.totals.needsReply,
      href: "/replies?needsReply=1",
    },
    {
      key: "meetings",
      label: translate("meetings"),
      value: data.totals.meetings,
      href: "/replies",
    },
  ];
  const stages = [
    { key: "companies", label: "companies", href: "/campaigns" },
    { key: "insights", label: "qualified", href: "/campaigns" },
    { key: "contacts", label: "contacts", href: "/prospects" },
    { key: "sequences", label: "sequences", href: "/review" },
  ] as const;
  const status = (stored: string) => {
    switch (stored) {
      case "pending":
        return "queued";
      case "starting":
        return "running";
      case "failed":
        return "held";
      default:
        return "uncertain";
    }
  };
  const stageLabel = (stage: string) => {
    const aliases: Record<string, string> = {
      preflight: "mx",
      collect: "qualify",
      location: "companyFacts",
      applyCompany: "promote",
      query: "startShoppingQuery",
      poll: "pollShoppingQuery",
      browser: "browseShopping",
      assess: "assessShopping",
      applyResearch: "applyShopping",
    };
    const key = aliases[stage] ?? stage;
    return Object.hasOwn(messages.outbound.automation.stages, key)
      ? messages.outbound.automation.stages[
          key as keyof typeof messages.outbound.automation.stages
        ]
      : automation("unknownStage");
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-px border-accent-foreground border-b bg-accent-foreground lg:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.key}
            href={metric.href}
            className="min-w-0 bg-background-rich px-4 py-6 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 sm:px-6"
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <ClockIcon aria-hidden className="size-4 text-primary" />
            {translate(
              data.setup.automationEnabled ? "automationOn" : "automationOff",
            )}
          </span>
          {!data.setup.linkedinEnabled && (
            <span className="text-foreground-dimmed">
              {translate("linkedinOff")}
            </span>
          )}
        </div>
        <PipelineRefresh />
      </div>
      <Suspense fallback={<ReportSkeleton />}>
        <WeeklyReport />
      </Suspense>
      <section className="border-accent-foreground border-b">
        <div className="px-4 pt-6 sm:px-6">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("pipelineTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
            {translate("pipelineHelp")}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-px bg-accent-foreground lg:grid-cols-4">
          {stages.map(({ key, label, href }) => (
            <div
              key={key}
              className="min-w-0 bg-background-rich px-4 py-4 sm:px-6"
            >
              <dt className="text-foreground-dimmed text-sm">
                <Link
                  href={href}
                  className="rounded-sm hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                >
                  {translate(label)}
                </Link>
              </dt>
              <dd className="mt-2 font-heading font-semibold text-2xl text-foreground-rich tabular-nums">
                {format.number(data.totals[key])}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="border-accent-foreground border-b">
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-6 sm:px-6">
          <div>
            <h2 className="font-semibold text-foreground-rich text-lg">
              {translate("campaignsTitle")}
            </h2>
            <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
              {translate("scopeHelp")}
            </p>
          </div>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/campaigns" />}
          >
            {translate("openCampaigns")}
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
                        {translate(key === "insights" ? "qualified" : key)}
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
              <p className="border-accent-foreground border-t px-4 py-4 text-foreground-dimmed text-sm sm:px-6">
                {translate("moreCampaigns")}
              </p>
            )}
          </>
        ) : (
          <Empty
            title={translate("emptyTitle")}
            description={translate("emptyHelp")}
          >
            <Button
              variant="soft"
              color="neutral"
              render={<Link href="/campaigns/new" />}
            >
              {translate("emptyAction")}
            </Button>
          </Empty>
        )}
      </section>
      <div className="grid border-accent-foreground border-b lg:grid-cols-2">
        <section className="border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("workTitle")}
          </h2>
          {data.work.length ? (
            <ol className="mt-4 divide-y divide-accent-foreground">
              {data.work.map((work) => (
                <li key={work.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      className="min-w-0 truncate font-medium text-primary-text text-sm"
                      href={
                        work.prospectId
                          ? `/prospects/${work.prospectId}`
                          : `/campaigns/${work.campaignId}/companies/${work.companyId}`
                      }
                    >
                      {work.company}
                    </Link>
                    <span className="shrink-0 text-foreground-dimmed text-xs">
                      {automation(`statuses.${status(work.status)}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-foreground-dimmed text-sm">
                    {stageLabel(work.stage)}
                  </p>
                  {work.reason && (
                    <p className="mt-2 text-sm">
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
            <p className="mt-4 text-foreground-dimmed text-sm leading-6">
              {translate("workEmpty")}
            </p>
          )}
        </section>
        <section className="px-4 py-6 sm:px-6">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("setupTitle")}
          </h2>
          {blockers.length ? (
            <ul className="mt-4 divide-y divide-accent-foreground">
              {blockers.map((blocker) => (
                <li
                  key={blocker.label}
                  className="flex items-start gap-2 py-4 text-sm"
                >
                  <AlertCircleIcon
                    aria-hidden
                    className="mt-2 size-4 shrink-0 text-warning"
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
            <p className="mt-4 flex items-start gap-2 text-foreground-dimmed text-sm leading-6">
              <CheckCircleIcon
                aria-hidden
                className="mt-2 size-4 shrink-0 text-success"
              />
              {translate("setupReady")}
            </p>
          )}
        </section>
      </div>
      <section className="border-accent-foreground border-b px-4 py-6 sm:px-6">
        <h2 className="font-semibold text-foreground-rich text-lg">
          {translate("activityTitle")}
        </h2>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link
            href="/replies?view=sent&channel=email"
            className="text-primary-text"
          >
            {translate("emailAccepted")}:{" "}
            <span className="font-semibold tabular-nums">
              {format.number(data.totals.acceptedEmails)}
            </span>
          </Link>
          <Link
            href="/replies?view=sent&channel=linkedin"
            className="text-primary-text"
          >
            {translate("linkedinAccepted")}:{" "}
            <span className="font-semibold tabular-nums">
              {format.number(data.totals.acceptedLinkedin)}
            </span>
          </Link>
        </div>
        <p className="mt-2 text-foreground-dimmed text-xs leading-5">
          {translate("acceptedHelp")}
        </p>
        <p className="mt-2 text-foreground-dimmed text-xs leading-5">
          {translate("meetingsHelp")}
        </p>
      </section>
      <Accordion className="px-4 sm:px-6">
        <AccordionItem value="automation" className="border-0">
          <AccordionTrigger className="py-6">
            {translate("detailsTitle")}
          </AccordionTrigger>
          <AccordionPanel className="[&>*]:border-b-0">
            <Suspense fallback={<AutomationSkeleton />}>
              <DetailedAutomation />
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
  if (report.success) return <ReportPanel report={report.data} />;
  const translate = await getTranslations("outbound.pipeline");
  return (
    <p
      role="alert"
      className="border-accent-foreground border-b px-4 py-6 text-error text-sm sm:px-6"
    >
      {translate("error")}
    </p>
  );
};

const ReportSkeleton = () => (
  <div
    aria-busy="true"
    className="min-h-96 border-accent-foreground border-b px-4 py-6 sm:px-6"
  >
    <div className="h-6 w-48 animate-pulse rounded-sm bg-background motion-reduce:animate-none" />
    <div className="mt-8 grid grid-cols-3 gap-4">
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="h-40 animate-pulse rounded-sm bg-background motion-reduce:animate-none"
        />
      ))}
    </div>
  </div>
);
