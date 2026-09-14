"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { useTranslations } from "next-intl";
import type { Report } from "@/lib/webmcp";
import { Label, Source } from "./audit";

export const ShoppingWorkflows = ({ report }: { report: Report }) => {
  const translate = useTranslations("webmcpScanner.report.commerce");
  const commerce = report.audit.commerce;

  return (
    <section className="border-accent-foreground border-b">
      <div className="space-y-4 p-6 sm:p-8">
        <h3 className="font-medium text-2xl text-foreground">
          {translate("title")}
        </h3>
        <p className="max-w-3xl text-foreground-dimmed text-sm leading-relaxed">
          {translate("description")}
        </p>
        {commerce.context === "unconfirmed" && (
          <div className="space-y-2 border-primary border-l-2 bg-background-dimmed p-4">
            <p className="font-medium text-foreground text-sm">
              {translate("unconfirmed.title")}
            </p>
            <p className="text-foreground-dimmed text-sm leading-relaxed">
              {translate("unconfirmed.description")}
            </p>
          </div>
        )}
      </div>
      <Accordion
        multiple
        className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2"
      >
        {commerce.workflows.map((workflow) => {
          const forms = report.forms.filter((form) =>
            workflow.formIds.includes(form.id),
          );
          const pages = [...new Set(forms.map((form) => form.pageUrl))];
          return (
            <AccordionItem
              key={workflow.id}
              value={workflow.id}
              className="min-w-0 border-0 bg-background-rich"
            >
              <AccordionTrigger className="items-start px-6 py-4 sm:px-8">
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground text-lg">
                      {translate(`workflows.${workflow.id}.title`)}
                    </span>
                    <Label
                      tone={
                        workflow.status === "toolFound"
                          ? "primary"
                          : workflow.status === "review"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {translate(`status.${workflow.status}`)}
                    </Label>
                  </span>
                  <span className="font-normal text-foreground-dimmed text-sm">
                    {translate(`workflows.${workflow.id}.purpose`)}
                  </span>
                  {workflow.tools.length > 0 && (
                    <span className="break-all font-mono font-normal text-primary text-xs">
                      {workflow.tools.map((tool) => tool.name).join(", ")}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <div className="space-y-4 px-6 pb-6 sm:px-8">
                  {workflow.tools.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-foreground text-xs">
                        {translate("toolEvidence")}
                      </p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-2">
                        {workflow.tools.map((tool) => (
                          <li
                            key={`${tool.pageUrl}-${tool.sourceUrl}-${tool.name}`}
                          >
                            <a
                              href={tool.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-mono text-primary text-xs underline underline-offset-4"
                            >
                              {tool.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {forms.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-foreground text-xs">
                        {translate("formEvidence", { count: forms.length })}
                      </p>
                      <ul className="space-y-2">
                        {pages.map((url) => (
                          <li key={url}>
                            <Source url={url} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-2 border-accent-foreground border-t pt-4">
                    <p className="font-medium text-foreground text-xs">
                      {translate("guidance")}
                    </p>
                    <p className="text-foreground-dimmed text-sm leading-relaxed">
                      {translate(`workflows.${workflow.id}.guidance`)}
                    </p>
                  </div>
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="space-y-2 border-accent-foreground border-t bg-background-dimmed px-6 py-4 sm:px-8">
        <p className="text-foreground-dimmed text-xs leading-relaxed">
          {translate("notObserved")}
        </p>
        <p className="text-foreground-dimmed text-xs leading-relaxed">
          {translate("evidenceNote")}
        </p>
      </div>
    </section>
  );
};
