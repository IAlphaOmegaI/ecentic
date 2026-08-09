"use client";

import { CheckCircleIcon, XCircleIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { type ReactNode, type SubmitEvent, useState } from "react";
import { Motion } from "@/components/motion";
import * as UcpAdvancedCheck from "@/server/app/intelligence/ucp/advanced-check";

type Tone = "success" | "danger" | "warning" | "neutral" | "skip";

const toneClasses: Record<Tone, string> = {
  success: "text-primary",
  danger: "text-error",
  warning: "text-warning",
  neutral: "text-foreground-dimmed",
  skip: "text-foreground-dimmed/60",
};

const chipToneClasses: Record<Tone, string> = {
  success: "bg-primary/10 text-primary",
  danger: "bg-error/10 text-error",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-background-dimmed text-foreground-dimmed",
  skip: "bg-background-dimmed text-foreground-dimmed/60",
};

const gradeConfig: Record<
  UcpAdvancedCheck.AdvancedGrade,
  { tone: Tone; label: string; descriptionKey: "A" | "B" | "C" | "F" }
> = {
  A: { tone: "success", label: "A", descriptionKey: "A" },
  B: { tone: "warning", label: "B", descriptionKey: "B" },
  C: { tone: "warning", label: "C", descriptionKey: "C" },
  F: { tone: "danger", label: "F", descriptionKey: "F" },
};

const formatLatency = (ms: number | null) => (ms === null ? "—" : `${ms} ms`);

const Chip = ({ label, tone }: { label: string; tone: Tone }) => (
  <span
    className={cn(
      "inline-flex w-fit items-center rounded-full px-2 py-0.5 font-semibold text-[11px]",
      chipToneClasses[tone],
    )}
  >
    {label}
  </span>
);

const formatTransport = (
  transport: string | null,
  translate: ReturnType<
    typeof useTranslations<"dashboard.ucp.advancedValidator">
  >,
) => {
  switch (transport) {
    case "rest":
      return translate("transport.rest");
    case "mcp":
      return translate("transport.mcp");
    case "a2a":
      return translate("transport.a2a");
    case "embedded":
      return translate("transport.embedded");
    default:
      return transport ?? "—";
  }
};

const EndpointProbeRow = ({
  probe,
}: {
  probe: UcpAdvancedCheck.EndpointProbeResult;
}) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");

  return (
    <div className="grid gap-3 bg-background px-4 py-4 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_80px_80px_80px] sm:items-center">
      <div>
        <p className="font-medium text-foreground text-sm">
          {probe.serviceLabel}
        </p>
        <p className="mt-0.5 break-all font-mono text-foreground-dimmed text-xs">
          {probe.serviceName}
        </p>
      </div>

      <div>
        <p className="break-all font-mono text-foreground text-xs">
          {probe.endpoint}
        </p>
        {probe.error && (
          <p className="mt-1 font-light text-error text-xs">{probe.error}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 sm:flex-col">
        <Chip
          label={
            probe.httpStatus !== null
              ? `HTTP ${probe.httpStatus}`
              : translate("chips.noResponse")
          }
          tone={probe.reachable ? "success" : "danger"}
        />
        <Chip
          label={formatTransport(probe.transport, translate)}
          tone="neutral"
        />
      </div>

      <div>
        <span
          className={cn(
            "font-medium font-mono text-sm tabular-nums",
            probe.latencyMs === null
              ? "text-foreground-dimmed"
              : probe.latencyMs < 400
                ? "text-primary"
                : probe.latencyMs < 1200
                  ? "text-warning"
                  : "text-error",
          )}
        >
          {formatLatency(probe.latencyMs)}
        </span>
      </div>

      <div>
        <Chip
          label={
            probe.corsAllowed
              ? translate("chips.corsOk")
              : translate("chips.noCors")
          }
          tone={probe.corsAllowed ? "success" : "warning"}
        />
      </div>
    </div>
  );
};

const LIFECYCLE_STEP_ORDER: UcpAdvancedCheck.CheckoutStep[] = [
  "cors",
  "cart_create",
  "cart_update",
  "checkout_create",
  "checkout_complete",
  "checkout_cancel",
];

const LifecycleStepRow = ({
  step,
}: {
  step: UcpAdvancedCheck.CheckoutStepResult;
}) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const tone: Tone = step.skipped ? "skip" : step.passed ? "success" : "danger";

  return (
    <div className="grid gap-3 bg-background px-4 py-4 md:grid-cols-[28px_minmax(0,160px)_60px_80px_minmax(0,1fr)] md:items-center">
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center",
          toneClasses[tone],
        )}
      >
        {step.skipped ? (
          <span className="font-medium text-[10px]">—</span>
        ) : step.passed ? (
          <CheckCircleIcon className="size-4" />
        ) : (
          <XCircleIcon className="size-4" />
        )}
      </span>

      <p className="font-medium text-foreground text-sm">{step.label}</p>

      <span
        className={cn(
          "font-medium font-mono text-sm tabular-nums",
          step.latencyMs === null
            ? "text-foreground-dimmed"
            : step.latencyMs < 400
              ? "text-primary"
              : step.latencyMs < 1200
                ? "text-warning"
                : "text-error",
        )}
      >
        {formatLatency(step.latencyMs)}
      </span>

      <Chip
        label={
          step.skipped
            ? translate("chips.skipped")
            : step.passed
              ? translate("chips.pass")
              : translate("chips.fail")
        }
        tone={tone}
      />

      <p className="font-light text-foreground-dimmed text-sm">{step.note}</p>
    </div>
  );
};

const McpToolTestRow = ({
  test,
}: {
  test: UcpAdvancedCheck.McpToolTestResult;
}) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const tone: Tone = !test.present
    ? "skip"
    : test.passed
      ? "success"
      : "danger";

  return (
    <div className="grid gap-3 bg-background-dimmed/40 px-4 py-2.5 md:grid-cols-[28px_minmax(0,200px)_80px_90px_minmax(0,1fr)] md:items-center">
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center text-[10px]",
          toneClasses[tone],
        )}
      >
        {!test.present ? (
          "—"
        ) : test.passed ? (
          <CheckCircleIcon className="size-4" />
        ) : (
          <XCircleIcon className="size-4" />
        )}
      </span>

      <p className="font-medium font-mono text-foreground text-xs">
        {test.toolName}
      </p>

      <span
        className={cn(
          "font-medium font-mono text-xs tabular-nums",
          test.latencyMs === null
            ? "text-foreground-dimmed"
            : test.latencyMs < 400
              ? "text-primary"
              : test.latencyMs < 1200
                ? "text-warning"
                : "text-error",
        )}
      >
        {formatLatency(test.latencyMs)}
      </span>

      <Chip
        label={
          !test.present
            ? translate("chips.missing")
            : test.passed
              ? translate("chips.pass")
              : translate("chips.fail")
        }
        tone={tone}
      />

      <p className="font-light text-foreground-dimmed text-xs">{test.note}</p>
    </div>
  );
};

const McpProbeRow = ({ probe }: { probe: UcpAdvancedCheck.McpProbeResult }) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const statusTone: Tone = probe.reachable ? "success" : "danger";
  const transportLabel =
    probe.transport === "http-json"
      ? translate("transport.streamableHttp")
      : probe.transport === "sse"
        ? translate("transport.sse")
        : translate("transport.unknown");

  return (
    <div className="bg-background">
      <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <p className="font-medium text-foreground text-sm">
            {probe.serviceLabel}
          </p>
          <p className="mt-0.5 break-all font-mono text-foreground-dimmed text-xs">
            {probe.endpoint}
          </p>
          {probe.error && (
            <p className="mt-1 font-light text-error text-xs">{probe.error}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip
            label={
              probe.httpStatus !== null
                ? `HTTP ${probe.httpStatus}`
                : translate("chips.noResponse")
            }
            tone={statusTone}
          />
          <Chip label={transportLabel} tone="neutral" />
          {probe.protocolVersion && (
            <Chip label={`MCP ${probe.protocolVersion}`} tone="success" />
          )}
          {probe.serverName && <Chip label={probe.serverName} tone="neutral" />}
          <span
            className={cn(
              "font-medium font-mono text-sm tabular-nums",
              probe.latencyMs === null
                ? "text-foreground-dimmed"
                : probe.latencyMs < 400
                  ? "text-primary"
                  : probe.latencyMs < 1200
                    ? "text-warning"
                    : "text-error",
            )}
          >
            {formatLatency(probe.latencyMs)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip
            label={translate("chips.toolsDeclared", {
              count: probe.tools.length,
            })}
            tone={probe.tools.length > 0 ? "success" : "neutral"}
          />
          {probe.hasSearch && (
            <Chip label={translate("chips.search")} tone="success" />
          )}
          {probe.hasCheckout && (
            <Chip label={translate("chips.checkout")} tone="success" />
          )}
          {probe.transport === "sse" && (
            <Chip label={translate("chips.sseWarning")} tone="warning" />
          )}
        </div>
      </div>

      {probe.toolTests.length > 0 && (
        <div className="border-accent-foreground border-t">
          <div className="hidden items-center gap-3 border-accent-foreground border-b bg-background-dimmed px-4 py-1.5 md:grid md:grid-cols-[28px_minmax(0,200px)_80px_90px_minmax(0,1fr)]">
            {(
              [
                "",
                translate("headers.tool"),
                translate("headers.latency"),
                translate("headers.result"),
                translate("headers.note"),
              ] as const
            ).map((header) => (
              <p
                key={header || "spacer"}
                className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
              >
                {header}
              </p>
            ))}
          </div>
          <div className="divide-y divide-accent-foreground">
            {probe.toolTests.map((test) => (
              <McpToolTestRow key={test.toolName} test={test} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const A2aProbeRow = ({ probe }: { probe: UcpAdvancedCheck.A2aProbeResult }) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const statusTone: Tone = probe.reachable ? "success" : "danger";

  return (
    <div className="grid gap-3 bg-background px-4 py-4 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div>
        <p className="font-medium text-foreground text-sm">
          {probe.serviceLabel}
        </p>
        <p className="mt-0.5 break-all font-mono text-foreground-dimmed text-xs">
          {probe.endpoint}
        </p>
        {probe.error && (
          <p className="mt-1 font-light text-error text-xs">{probe.error}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip
          label={
            probe.httpStatus !== null
              ? `HTTP ${probe.httpStatus}`
              : translate("chips.noResponse")
          }
          tone={statusTone}
        />
        <Chip label={translate("transport.a2a")} tone="neutral" />
        {probe.agentName && <Chip label={probe.agentName} tone="neutral" />}
        <span
          className={cn(
            "font-medium font-mono text-sm tabular-nums",
            probe.latencyMs === null
              ? "text-foreground-dimmed"
              : probe.latencyMs < 400
                ? "text-primary"
                : probe.latencyMs < 1200
                  ? "text-warning"
                  : "text-error",
          )}
        >
          {formatLatency(probe.latencyMs)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip
          label={
            probe.agentCardFound
              ? translate("chips.agentCardFound")
              : translate("chips.noAgentCard")
          }
          tone={probe.agentCardFound ? "success" : "warning"}
        />
        <Chip
          label={
            probe.ucpExtensionPresent
              ? translate("chips.ucpExtension")
              : translate("chips.noUcpExtension")
          }
          tone={probe.ucpExtensionPresent ? "success" : "warning"}
        />
      </div>
    </div>
  );
};

const GradeCard = ({
  grade,
  detail,
}: {
  grade: UcpAdvancedCheck.AdvancedGrade;
  detail: string;
}) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const config = gradeConfig[grade];

  return (
    <div className="flex items-center gap-5 bg-background px-5 py-5">
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded-lg font-semibold text-4xl",
          chipToneClasses[config.tone],
        )}
      >
        {config.label}
      </div>
      <div>
        <p className="font-semibold text-base text-foreground-rich">
          {translate(`grades.${config.descriptionKey}.description`)}
        </p>
        <p className="mt-1 text-foreground-dimmed text-sm">{detail}</p>
      </div>
    </div>
  );
};

type ProbeSection = {
  key: string;
  title: string;
  description: string;
  failCount: number;
  total: number;
  body: ReactNode;
};

// Each probe group collapses to a row with a pass/fail chip; only groups with
// failures auto-expand, so the user lands on what's broken instead of scrolling
// every passing row.
const AdvancedResults = ({
  result,
}: {
  result: UcpAdvancedCheck.AdvancedCheckResult;
}) => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const endpointHeaders = [
    translate("headers.service"),
    translate("headers.endpoint"),
    translate("headers.status"),
    translate("headers.latency"),
    translate("headers.cors"),
  ] as const;

  const sections: ProbeSection[] = [
    result.endpointProbes.length > 0 && {
      key: "endpoints",
      title: translate("sections.endpoints.title"),
      description: translate("sections.endpoints.description"),
      failCount: result.endpointProbes.filter((probe) => !probe.reachable)
        .length,
      total: result.endpointProbes.length,
      body: (
        <>
          <div className="hidden border-accent-foreground border-b bg-background-dimmed px-4 py-2 sm:grid sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_80px_80px_80px]">
            {endpointHeaders.map((header) => (
              <p
                key={header}
                className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
              >
                {header}
              </p>
            ))}
          </div>
          <div className="divide-y divide-accent-foreground">
            {result.endpointProbes.map((probe) => (
              <EndpointProbeRow
                key={`${probe.serviceName}-${probe.endpoint}`}
                probe={probe}
              />
            ))}
          </div>
        </>
      ),
    },
    result.mcpProbes.length > 0 && {
      key: "mcp",
      title: translate("sections.mcp.title"),
      description: translate("sections.mcp.description"),
      failCount: result.mcpProbes.filter((probe) => !probe.reachable).length,
      total: result.mcpProbes.length,
      body: (
        <div className="divide-y divide-accent-foreground">
          {result.mcpProbes.map((probe) => (
            <McpProbeRow
              key={`${probe.serviceName}-${probe.endpoint}`}
              probe={probe}
            />
          ))}
        </div>
      ),
    },
    result.a2aProbes.length > 0 && {
      key: "a2a",
      title: translate("sections.a2a.title"),
      description: translate("sections.a2a.description"),
      failCount: result.a2aProbes.filter((probe) => !probe.reachable).length,
      total: result.a2aProbes.length,
      body: (
        <div className="divide-y divide-accent-foreground">
          {result.a2aProbes.map((probe) => (
            <A2aProbeRow
              key={`${probe.serviceName}-${probe.endpoint}`}
              probe={probe}
            />
          ))}
        </div>
      ),
    },
    result.checkoutLifecycle.length > 0 && {
      key: "checkout",
      title: translate("sections.checkout.title"),
      description: translate("sections.checkout.description"),
      failCount: result.checkoutLifecycle.filter(
        (step) => !step.skipped && !step.passed,
      ).length,
      total: result.checkoutLifecycle.filter((step) => !step.skipped).length,
      body: (
        <div className="divide-y divide-accent-foreground">
          {LIFECYCLE_STEP_ORDER.map((stepKey) => {
            const step = result.checkoutLifecycle.find(
              (s) => s.step === stepKey,
            );
            if (!step) return null;
            return <LifecycleStepRow key={step.step} step={step} />;
          })}
        </div>
      ),
    },
  ].filter(Boolean) as ProbeSection[];

  return (
    <Motion.Up className="border-accent-foreground border-t">
      <GradeCard grade={result.grade} detail={result.gradeDetail} />

      {sections.length === 0 ? (
        <div className="border-accent-foreground border-t bg-background px-5 py-5">
          <p className="font-light text-foreground-dimmed text-sm">
            {translate("emptyEndpoints")}
            <span className="font-mono text-foreground">
              {translate("emptyEndpointsField")}
            </span>
            {translate("emptyEndpointsSuffix")}
          </p>
        </div>
      ) : (
        <Accordion
          className="text-foreground"
          defaultValue={sections
            .filter((section) => section.failCount > 0)
            .map((section) => section.key)}
        >
          {sections.map((section) => (
            <AccordionItem
              key={section.key}
              value={section.key}
              className="border-accent-foreground border-t"
            >
              <AccordionTrigger
                className="items-center bg-background-dimmed px-4 py-3 hover:bg-background-dimmed/70 sm:px-5"
                classList={{
                  trigger: {
                    icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
                  },
                }}
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    {section.title}
                  </span>
                  <Chip
                    label={
                      section.failCount > 0
                        ? translate("chips.failing", {
                            count: section.failCount,
                          })
                        : translate("chips.ok", { total: section.total })
                    }
                    tone={section.failCount > 0 ? "danger" : "success"}
                  />
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <p className="border-accent-foreground border-t bg-background-dimmed px-4 py-2 text-foreground-dimmed text-xs sm:px-5">
                  {section.description}
                </p>
                {section.body}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </Motion.Up>
  );
};

export const UcpAdvancedValidator = () => {
  const translate = useTranslations("dashboard.ucp.advancedValidator");
  const toast = useToastManager();
  const [domain, setDomain] = useState("");
  const [result, setResult] =
    useState<UcpAdvancedCheck.AdvancedCheckResult | null>(null);

  const [handleCheck, isChecking] = useAsyncAction(async () => {
    const response = await UcpAdvancedCheck.checkUCPAdvanced(domain);

    if (!response.success) {
      toast.add({
        title: translate("toast.failed"),
        description: response.error,
        type: "error",
      });
      return;
    }

    setResult(response.data);
  });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCheck();
  };

  return (
    <div className="flex flex-col">
      <div className="grid lg:grid-cols-2">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <span className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.1em]">
            {translate("kicker")}
          </span>
          <h2 className="mt-2 font-bold text-foreground-rich text-xl tracking-[-0.02em]">
            {translate("title")}
          </h2>
          <p className="mt-1.5 font-light text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>

        <div className="flex flex-col justify-center border-accent-foreground border-t px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="ucp-advanced-domain"
              className="block font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
            >
              {translate("fields.domain.label")}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <TextField
                value={domain}
                onValueChange={setDomain}
                className="flex-1"
              >
                <TextFieldInput
                  id="ucp-advanced-domain"
                  placeholder={translate("fields.domain.placeholder")}
                />
              </TextField>
              <Button
                type="submit"
                color="primary"
                disabled={isChecking || !domain.trim()}
                className="w-full shrink-0 sm:w-auto"
              >
                {isChecking
                  ? translate("action.running")
                  : translate("action.primary")}
              </Button>
            </div>
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              {translate("hint")}
            </p>
          </form>
        </div>
      </div>

      {result && <AdvancedResults result={result} />}
    </div>
  );
};
