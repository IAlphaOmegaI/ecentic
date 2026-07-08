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
  { tone: Tone; label: string; description: string }
> = {
  A: { tone: "success", label: "A", description: "Agent-ready" },
  B: { tone: "warning", label: "B", description: "Mostly ready" },
  C: { tone: "warning", label: "C", description: "Needs work" },
  F: { tone: "danger", label: "F", description: "Critical issues" },
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

const formatTransport = (transport: string | null) => {
  switch (transport) {
    case "rest":
      return "REST";
    case "mcp":
      return "MCP";
    case "a2a":
      return "A2A";
    case "embedded":
      return "Embedded";
    default:
      return transport ?? "—";
  }
};

const EndpointProbeRow = ({
  probe,
}: {
  probe: UcpAdvancedCheck.EndpointProbeResult;
}) => (
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
          probe.httpStatus !== null ? `HTTP ${probe.httpStatus}` : "No response"
        }
        tone={probe.reachable ? "success" : "danger"}
      />
      <Chip label={formatTransport(probe.transport)} tone="neutral" />
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
        label={probe.corsAllowed ? "CORS ✓" : "No CORS"}
        tone={probe.corsAllowed ? "success" : "warning"}
      />
    </div>
  </div>
);

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
        label={step.skipped ? "Skipped" : step.passed ? "Pass" : "Fail"}
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
        label={!test.present ? "Missing" : test.passed ? "Pass" : "Fail"}
        tone={tone}
      />

      <p className="font-light text-foreground-dimmed text-xs">{test.note}</p>
    </div>
  );
};

const McpProbeRow = ({ probe }: { probe: UcpAdvancedCheck.McpProbeResult }) => {
  const statusTone: Tone = probe.reachable ? "success" : "danger";
  const transportLabel =
    probe.transport === "http-json"
      ? "Streamable HTTP"
      : probe.transport === "sse"
        ? "SSE"
        : "Unknown";

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
                : "No response"
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
            label={`${probe.tools.length} tool${probe.tools.length !== 1 ? "s" : ""} declared`}
            tone={probe.tools.length > 0 ? "success" : "neutral"}
          />
          {probe.hasSearch && <Chip label="Search" tone="success" />}
          {probe.hasCheckout && <Chip label="Checkout" tone="success" />}
          {probe.transport === "sse" && (
            <Chip
              label="SSE — tool calls require streaming client"
              tone="warning"
            />
          )}
        </div>
      </div>

      {probe.toolTests.length > 0 && (
        <div className="border-accent-foreground border-t">
          <div className="hidden items-center gap-3 border-accent-foreground border-b bg-background-dimmed px-4 py-1.5 md:grid md:grid-cols-[28px_minmax(0,200px)_80px_90px_minmax(0,1fr)]">
            {["", "Tool", "Latency", "Result", "Note"].map((h) => (
              <p
                key={h}
                className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
              >
                {h}
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
              : "No response"
          }
          tone={statusTone}
        />
        <Chip label="A2A" tone="neutral" />
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
          label={probe.agentCardFound ? "Agent card found" : "No agent card"}
          tone={probe.agentCardFound ? "success" : "warning"}
        />
        <Chip
          label={
            probe.ucpExtensionPresent ? "UCP extension" : "No UCP extension"
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
          {config.description}
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
  const sections: ProbeSection[] = [
    result.endpointProbes.length > 0 && {
      key: "endpoints",
      title: "Service endpoint probes",
      description:
        "Live HEAD request to each service endpoint declared in the UCP profile. Latency is measured from this server.",
      failCount: result.endpointProbes.filter((probe) => !probe.reachable)
        .length,
      total: result.endpointProbes.length,
      body: (
        <>
          <div className="hidden border-accent-foreground border-b bg-background-dimmed px-4 py-2 sm:grid sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_80px_80px_80px]">
            {["Service", "Endpoint", "Status", "Latency", "CORS"].map((h) => (
              <p
                key={h}
                className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
              >
                {h}
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
      title: "MCP endpoints",
      description:
        "Probes MCP service endpoints via JSON-RPC initialize + tools/list. Shows the protocol version, server identity, and every tool the agent can call.",
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
      title: "A2A endpoints",
      description:
        "Probes Agent-to-Agent service endpoints. Checks reachability, agent card presence at /.well-known/agent-card.json, and UCP extension header.",
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
      title: "Checkout lifecycle",
      description:
        "Simulates the cart → checkout session flow per UCP REST spec: POST /carts → PUT /carts/{id} → POST /checkout-sessions → complete → cancel. 400/422 responses are expected for probe inputs.",
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
            No service endpoints with URLs found in the UCP profile. Add{" "}
            <span className="font-mono text-foreground">endpoint</span> fields
            to your services to enable live testing.
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
                        ? `${section.failCount} failing`
                        : `${section.total} OK`
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
  const toast = useToastManager();
  const [domain, setDomain] = useState("");
  const [result, setResult] =
    useState<UcpAdvancedCheck.AdvancedCheckResult | null>(null);

  const [handleCheck, isChecking] = useAsyncAction(async () => {
    const response = await UcpAdvancedCheck.checkUCPAdvanced(domain);

    if (!response.success) {
      toast.add({
        title: "Advanced check failed",
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
      <div className="border-accent-foreground border-t bg-background-dimmed px-5 py-4">
        <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
          Advanced endpoint & lifecycle testing
        </p>
        <p className="mt-1 text-foreground-dimmed text-xs">
          Probes all service endpoints declared in the profile and simulates the
          full AI agent checkout lifecycle — Create → Update → Complete →
          Cancel. Makes live HTTP requests to the merchant server.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-px bg-accent-foreground sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="bg-background-rich px-4 py-3">
          <TextField
            value={domain}
            onValueChange={setDomain}
            className="h-10 bg-background-rich"
          >
            <TextFieldInput
              placeholder="yourdomain.com"
              className="px-3 text-sm"
              aria-label="Domain for advanced testing"
            />
          </TextField>
        </div>
        <div className="flex items-center bg-background-rich px-4 py-3">
          <Button
            type="submit"
            color="primary"
            disabled={isChecking || !domain.trim()}
            className="w-full justify-center py-2 text-sm sm:w-auto"
          >
            {isChecking ? "Testing…" : "Run advanced tests"}
          </Button>
        </div>
      </form>

      {result && <AdvancedResults result={result} />}
    </div>
  );
};
