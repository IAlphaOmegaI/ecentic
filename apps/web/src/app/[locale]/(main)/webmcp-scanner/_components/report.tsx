"use client";

import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useFormatter, useTranslations } from "next-intl";
import { Motion } from "@/components/motion";
import type { AuditFinding, FormEvidence, Report, Tool } from "@/lib/webmcp";
import { AuditPanel, Label, Source } from "./audit";
import { ShoppingWorkflows } from "./commerce";

const ToolDetails = ({ tool }: { tool: Tool }) => {
  const translate = useTranslations("webmcpScanner.report");
  return (
    <div className="space-y-6 px-6 pb-6 sm:px-8">
      <p className="text-foreground-dimmed text-sm leading-relaxed">
        {tool.description ?? translate("tools.noDescription")}
      </p>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <dt className="font-medium text-foreground">
            {translate("tools.page")}
          </dt>
          <dd>
            <Source url={tool.pageUrl} />
          </dd>
        </div>
        <div className="min-w-0 space-y-2">
          <dt className="font-medium text-foreground">
            {translate("tools.source")}
          </dt>
          <dd>
            <Source url={tool.sourceUrl} />
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="font-medium text-foreground">
            {translate("tools.schemaLabel")}
          </dt>
          <dd className="text-foreground-dimmed">
            {translate(`tools.schema.${tool.schemaState}`)}
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="font-medium text-foreground">
            {translate("tools.executionLabel")}
          </dt>
          <dd className="text-foreground-dimmed">
            {translate(`tools.execution.${tool.execution}`)}
          </dd>
        </div>
      </dl>
      <div className="space-y-4">
        <p className="font-medium text-foreground text-sm">
          {translate("tools.parametersTitle")}
        </p>
        {tool.parameters.length > 0 ? (
          <ul className="divide-y divide-accent-foreground border-accent-foreground border-y">
            {tool.parameters.map((parameter) => (
              <li key={parameter.name} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all text-foreground text-sm">
                    {parameter.name}
                  </code>
                  <Label>
                    {parameter.type ?? translate("tools.typeUnknown")}
                  </Label>
                  <Label>
                    {translate(
                      parameter.required === true
                        ? "tools.required"
                        : parameter.required === false
                          ? "tools.optional"
                          : "tools.requirementUnknown",
                    )}
                  </Label>
                </div>
                <p className="text-foreground-dimmed text-sm">
                  {parameter.description ??
                    translate("tools.parameterDescriptionMissing")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground-dimmed text-sm">
            {translate("tools.noInputs")}
          </p>
        )}
      </div>
      {tool.issues.length > 0 && (
        <ul className="space-y-2 text-foreground-dimmed text-sm">
          {tool.issues.map((issue) => (
            <li key={issue}>{translate(`issues.${issue}`)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ToolsPanel = ({ report }: { report: Report }) => {
  const translate = useTranslations("webmcpScanner.report");
  const hasNames = report.tools.some((tool) => tool.name?.trim());
  const hasUnnamed = report.tools.some((tool) => !tool.name?.trim());
  return (
    <div>
      <div className="space-y-2 p-6 sm:p-8">
        <h3 className="font-medium text-foreground text-xl">
          {translate("tools.title")}
        </h3>
        <p className="text-foreground-dimmed text-sm">
          {translate("tools.description")}
        </p>
        {hasUnnamed && (
          <p className="text-foreground-dimmed text-sm">
            {translate(
              hasNames ? "tools.partiallyResolved" : "tools.unresolved",
            )}
          </p>
        )}
      </div>
      {report.tools.length > 0 ? (
        <Accordion multiple className="border-accent-foreground border-t">
          {report.tools.map((tool, index) => (
            <AccordionItem
              // biome-ignore lint/suspicious/noArrayIndexKey: definitions can repeat; every immutable report mounts under its run key.
              key={`${tool.sourceUrl}-${tool.name}-${index}`}
              value={String(index)}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <AccordionTrigger className="px-6 py-4 text-left sm:px-8">
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="break-all font-medium text-foreground">
                    {tool.name?.trim() || translate("tools.unnamed")}
                  </span>
                  <span className="font-normal text-foreground-dimmed text-xs">
                    {translate(`tools.kind.${tool.kind}`)}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <ToolDetails tool={tool} />
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="px-6 pb-6 text-foreground-dimmed text-sm sm:px-8">
          {translate(
            report.signals.length > 0 ? "tools.unresolved" : "tools.empty",
          )}
        </p>
      )}
    </div>
  );
};

const FormDetails = ({
  form,
  relatedTools,
  recommendation,
}: {
  form: FormEvidence;
  relatedTools: string[];
  recommendation?: AuditFinding;
}) => {
  const translate = useTranslations("webmcpScanner.report.forms");
  const translateAudit = useTranslations("webmcpScanner.report.audit");
  return (
    <div className="space-y-6 px-6 pb-6 sm:px-8">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <dt className="font-medium text-foreground">
            {translate("selector")}
          </dt>
          <dd className="break-all font-mono text-foreground-dimmed text-xs">
            {form.selector}
          </dd>
        </div>
        <div className="min-w-0 space-y-2">
          <dt className="font-medium text-foreground">{translate("page")}</dt>
          <dd>
            <Source url={form.pageUrl} />
          </dd>
        </div>
        <div className="min-w-0 space-y-2">
          <dt className="font-medium text-foreground">{translate("action")}</dt>
          <dd className="break-all font-mono text-foreground-dimmed text-xs">
            {form.action || translate("currentPage")}
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="font-medium text-foreground">{translate("method")}</dt>
          <dd className="font-mono text-foreground-dimmed text-xs">
            {form.method.toUpperCase()}
          </dd>
        </div>
        {form.toolName && (
          <div className="min-w-0 space-y-2 sm:col-span-2">
            <dt className="font-medium text-foreground">
              {translate("toolName")}
            </dt>
            <dd className="break-all font-mono text-foreground-dimmed text-xs">
              {form.toolName}
            </dd>
          </div>
        )}
      </dl>
      {relatedTools.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground text-sm">
            {translate("relatedTools")}
          </p>
          <p className="break-words font-mono text-foreground-dimmed text-xs">
            {relatedTools.join(", ")}
          </p>
          <p className="text-foreground-dimmed text-sm">
            {translate("relatedNote")}
          </p>
        </div>
      )}
      {form.sensitive && (
        <p className="text-foreground-dimmed text-sm">
          {translate("sensitive")}
        </p>
      )}
      {form.autoSubmit && (
        <p className="text-foreground-dimmed text-sm leading-relaxed">
          {translate("autoSubmit")}
        </p>
      )}
      {recommendation && (
        <div className="space-y-2">
          <h4 className="font-medium text-foreground text-sm">
            {translateAudit(`findings.${recommendation.code}.title`)}
          </h4>
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {recommendation.formIntent
              ? translate(`guidance.${recommendation.formIntent}.fix`)
              : translateAudit(`findings.${recommendation.code}.fix`)}
          </p>
          {recommendation.occurrences.length > 1 && (
            <p className="text-foreground-dimmed text-xs">
              {translateAudit("occurrences", {
                count: recommendation.occurrences.length,
              })}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground text-sm">
          {translate("fields")}
        </h4>
        {form.fields.length > 0 ? (
          <ul className="divide-y divide-accent-foreground border-accent-foreground border-y">
            {form.fields.map((field, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: immutable form fields can share a name or be unnamed.
                key={`${field.name}-${index}`}
                className="space-y-2 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all text-foreground text-sm">
                    {field.name || translate("unnamedField")}
                  </code>
                  <Label>{field.type}</Label>
                  <Label>
                    {translate(field.required ? "required" : "optional")}
                  </Label>
                </div>
                {field.description && (
                  <p className="text-foreground-dimmed text-sm">
                    {field.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground-dimmed text-sm">
            {translate("noFields")}
          </p>
        )}
      </div>
    </div>
  );
};

const FormsPanel = ({ report }: { report: Report }) => {
  const translate = useTranslations("webmcpScanner.report.forms");
  return (
    <div>
      <div className="space-y-2 p-6 sm:p-8">
        <h3 className="font-medium text-foreground text-xl">
          {translate("title")}
        </h3>
        <p className="text-foreground-dimmed text-sm leading-relaxed">
          {translate("description")}
        </p>
      </div>
      {report.forms.length > 0 ? (
        <Accordion multiple className="border-accent-foreground border-t">
          {report.forms.map((form) => {
            const findings = report.audit.findings.filter(
              (finding) =>
                finding.formId === form.id ||
                finding.occurrences.some(
                  (occurrence) => occurrence.formId === form.id,
                ),
            );
            const intent = findings.find(
              (finding) => finding.formIntent,
            )?.formIntent;
            const relatedTools = [
              ...new Set(findings.flatMap((finding) => finding.relatedTools)),
            ];
            return (
              <AccordionItem
                key={form.id}
                value={form.id}
                className="border-accent-foreground border-b last:border-b-0"
              >
                <AccordionTrigger className="px-6 py-4 text-left sm:px-8">
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="break-all font-medium text-foreground">
                      {intent
                        ? translate(`intent.${intent}`)
                        : form.label ||
                          form.toolName ||
                          translate("intent.other")}
                    </span>
                    <span className="font-normal text-foreground-dimmed text-xs">
                      {translate(form.declared ? "declared" : "unannotated")}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel>
                  <FormDetails
                    form={form}
                    relatedTools={relatedTools}
                    recommendation={findings.find(
                      (finding) =>
                        finding.code === "formOpportunity" ||
                        finding.code === "formReview",
                    )}
                  />
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <p className="px-6 pb-6 text-foreground-dimmed text-sm sm:px-8">
          {translate("empty")}
        </p>
      )}
    </div>
  );
};

const CoveragePanel = ({ report }: { report: Report }) => {
  const translate = useTranslations("webmcpScanner.report");
  const formatter = useFormatter();
  const signalNames = {
    "context-api": "contextApi",
    "register-tool": "registerTool",
    "provide-context": "provideContext",
  } as const;
  return (
    <div className="divide-y divide-accent-foreground">
      <div className="space-y-4 p-6 sm:p-8">
        <h3 className="font-medium text-foreground text-xl">
          {translate("coverage.title")}
        </h3>
        <p className="text-foreground-dimmed text-sm">
          {translate("coverage.totals", {
            pages: report.coverage.pages,
            scripts: report.coverage.scripts,
          })}
        </p>
        <ul className="space-y-4">
          {report.pages.map((page) => (
            <li
              key={page.url}
              className="flex flex-col gap-2 sm:flex-row sm:justify-between"
            >
              <Source url={page.url} />
              <span className="shrink-0 text-foreground-dimmed text-xs">
                {translate(`coverage.${page.status}`)}
                {page.httpStatus !== null ? ` · HTTP ${page.httpStatus}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-foreground-dimmed text-sm">
          {translate("coverage.skipped", {
            scripts: report.coverage.skippedScripts,
            resources: report.coverage.failedResources,
          })}
        </p>
      </div>
      {report.signals.length > 0 && (
        <div className="space-y-4 p-6 sm:p-8">
          <h3 className="font-medium text-foreground text-lg">
            {translate("signals.title")} ·{" "}
            {formatter.number(report.signals.length)}
          </h3>
          <p className="text-foreground-dimmed text-sm">
            {translate("signals.description")}
          </p>
          <ul className="space-y-4">
            {report.signals.map((signal) => (
              <li
                key={`${signal.pageUrl}-${signal.sourceUrl}-${signal.kind}`}
                className="space-y-2"
              >
                <p className="text-foreground text-sm">
                  {translate(`signals.${signalNames[signal.kind]}`)}
                </p>
                <Source url={signal.sourceUrl} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-4 bg-background-dimmed p-6 sm:p-8">
        <h3 className="font-medium text-foreground text-lg">
          {translate("limitations.title")}
        </h3>
        <ul className="space-y-2 text-foreground-dimmed text-sm leading-relaxed">
          {report.limitations.map((limitation) => (
            <li key={limitation}>{translate(`limitations.${limitation}`)}</li>
          ))}
        </ul>
        <p className="text-foreground text-sm leading-relaxed">
          {translate("nextStep")}
        </p>
      </div>
    </div>
  );
};

export const ScanReport = ({ report }: { report: Report }) => {
  const translate = useTranslations("webmcpScanner.report");
  const formatter = useFormatter();
  const namedTools = report.tools.filter((tool) => tool.name?.trim()).length;
  const unresolved =
    namedTools === 0 && (report.tools.length > 0 || report.signals.length > 0);
  const knownTools = unresolved
    ? translate("counts.notResolved")
    : formatter.number(namedTools);
  return (
    <Motion.Up
      initial="hidden"
      animate="visible"
      className="border-accent-foreground border-t"
    >
      <div className="space-y-4 bg-background-dimmed p-6 sm:p-8">
        <p className="text-primary text-sm">{translate("label")}</p>
        <h2 className="font-medium text-2xl text-foreground">
          {translate("audit.title")}
        </h2>
        <Source url={report.url} />
        <p className="max-w-3xl text-foreground-dimmed text-sm leading-relaxed">
          {translate("audit.description")}
        </p>
        <p className="text-foreground-dimmed text-xs">
          {translate("scannedAt", {
            date: formatter.dateTime(new Date(report.scannedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-px border-accent-foreground border-y bg-accent-foreground sm:grid-cols-4">
        {(
          [
            [
              "high",
              formatter.number(report.audit.summary.high),
              report.audit.summary.high > 0 ? "text-error" : "text-foreground",
            ],
            [
              "improvements",
              formatter.number(report.audit.summary.improvements),
              "text-foreground",
            ],
            [
              "opportunities",
              formatter.number(report.audit.summary.opportunities),
              "text-primary",
            ],
            ["tools", knownTools, "text-foreground"],
          ] as const
        ).map(([key, value, tone]) => (
          <div key={key} className="bg-background-rich p-6">
            <dt className="text-foreground-dimmed text-sm">
              {translate(`audit.summary.${key}`)}
            </dt>
            <dd
              className={cn(
                "mt-2 font-medium",
                key === "tools" && unresolved ? "text-xl" : "text-3xl",
                tone,
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <Tabs defaultValue="audit">
        <div className="overflow-x-auto border-accent-foreground border-b px-6 py-4 sm:px-8">
          <TabsList aria-label={translate("tabs.label")} className="min-w-max">
            <Tab value="audit" className="whitespace-nowrap">
              {translate("tabs.audit")} ·{" "}
              {formatter.number(
                report.audit.findings.filter(
                  (finding) => finding.code !== "formReview",
                ).length,
              )}
            </Tab>
            <Tab value="tools" className="whitespace-nowrap">
              {translate("tabs.tools")} · {knownTools}
            </Tab>
            <Tab value="forms" className="whitespace-nowrap">
              {translate("tabs.forms")} ·{" "}
              {formatter.number(report.forms.length)}
            </Tab>
            <Tab value="coverage" className="whitespace-nowrap">
              {translate("tabs.coverage")}
            </Tab>
            <TabsIndicator />
          </TabsList>
        </div>
        <TabsPanel value="audit">
          <ShoppingWorkflows report={report} />
          <AuditPanel report={report} />
        </TabsPanel>
        <TabsPanel value="tools">
          <ToolsPanel report={report} />
        </TabsPanel>
        <TabsPanel value="forms">
          <FormsPanel report={report} />
        </TabsPanel>
        <TabsPanel value="coverage">
          <CoveragePanel report={report} />
        </TabsPanel>
      </Tabs>
    </Motion.Up>
  );
};
