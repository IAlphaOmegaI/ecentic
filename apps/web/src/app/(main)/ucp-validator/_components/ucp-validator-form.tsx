"use client";

import {
  CheckCircleIcon,
  CodeIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import { type SubmitEvent, useState } from "react";
import { Motion } from "@/components/motion";
import * as UcpCheck from "@/server/app/intelligence/ucp-check";

type JToken = {
  text: string;
  type: "key" | "string" | "number" | "boolean" | "null" | "punct" | "space";
};

type Tone = "success" | "danger" | "warning" | "neutral";

const LATEST_UCP_VERSION = "2026-04-08";

const ISSUE_CATEGORY_LABELS: Record<UcpCheck.SpecIssueCategory, string> = {
  envelope: "Envelope",
  version: "Version",
  services: "Services",
  capabilities: "Capabilities",
  payment_handlers: "Payment handlers",
  signing_keys: "Signing keys",
  supported_versions: "Supported versions",
  transport: "Transport",
  security: "Security",
};

const ISSUE_CATEGORY_ORDER: UcpCheck.SpecIssueCategory[] = [
  "envelope",
  "version",
  "services",
  "transport",
  "capabilities",
  "payment_handlers",
  "signing_keys",
  "security",
  "supported_versions",
];

const notes = [
  {
    title: "Use the public storefront domain",
    detail:
      "Enter the root domain only, like acme.com or www.acme.com. We always validate the HTTPS version.",
  },
  {
    title: "We validate the full UCP 2026-04-08 spec",
    detail:
      "Services, capabilities, payment handlers, signing keys (JWK / RFC 9421), supported versions and transports are all parsed and checked.",
  },
  {
    title: "robots.txt matters too",
    detail:
      "A valid profile can still be hard for agents to use if key crawlers are blocked higher up the stack.",
  },
] as const;

const toneClassList: Record<Tone, string> = {
  success: "border-primary/20 bg-primary/10 text-primary",
  danger: "border-red-500/20 bg-red-500/10 text-red-500",
  warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
  neutral: "border-accent-foreground bg-background text-foreground-dimmed",
};

const tokenColor: Record<JToken["type"], string> = {
  key: "text-blue-400",
  string: "text-green-400",
  number: "text-orange-400",
  boolean: "text-purple-400",
  null: "text-orange-300/60",
  punct: "text-foreground-dimmed/60",
  space: "",
};

const formatLatency = (latencyMs: number | null): string =>
  latencyMs === null ? "Unavailable" : `${latencyMs} ms`;

const formatTransport = (transport: string | null): string => {
  if (!transport) return "—";
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
      return transport;
  }
};

const StatusChip = ({ label, tone }: { label: string; tone: Tone }) => (
  <span
    className={cn(
      "inline-flex w-fit items-center border px-2.5 py-1 font-medium text-xs",
      toneClassList[tone],
    )}
  >
    {label}
  </span>
);

const SectionHeading = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3 sm:px-5">
    <p className="font-medium text-foreground text-sm">{title}</p>
    {description && (
      <p className="mt-1 font-light text-foreground-dimmed text-xs">
        {description}
      </p>
    )}
  </div>
);

const SummaryCard = ({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) => (
  <div className="flex flex-col justify-between gap-3 bg-background-dimmed px-4 py-5">
    <p className="font-medium text-foreground-dimmed text-xs uppercase tracking-[0.18em]">
      {label}
    </p>
    <div>
      <p
        className={cn(
          "font-medium text-2xl text-foreground",
          tone === "success" && "text-primary",
          tone === "danger" && "text-red-500",
          tone === "warning" && "text-yellow-500",
        )}
      >
        {value}
      </p>
      <p className="mt-1 font-light text-foreground-dimmed text-xs">{detail}</p>
    </div>
  </div>
);

const CheckRow = ({
  label,
  passed,
  detail,
}: {
  label: string;
  passed: boolean;
  detail?: string | null;
}) => {
  const tone: Tone = passed ? "success" : "danger";

  return (
    <div className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-center">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center border",
            toneClassList[tone],
          )}
        >
          {passed ? (
            <CheckCircleIcon className="size-4" />
          ) : (
            <XCircleIcon className="size-4" />
          )}
        </span>
        <p className="font-medium text-foreground text-sm">{label}</p>
      </div>

      <p className="font-light text-foreground-dimmed text-sm">
        {detail ?? "—"}
      </p>

      <StatusChip label={passed ? "Pass" : "Fail"} tone={tone} />
    </div>
  );
};

const tokenizeJson = (json: string): JToken[] => {
  const tokens: JToken[] = [];
  let index = 0;

  while (index < json.length) {
    const currentCharacter = json[index];
    if (!currentCharacter) break;

    if (/\s/.test(currentCharacter)) {
      let text = "";
      while (index < json.length) {
        const character = json[index];
        if (!character || !/\s/.test(character)) break;
        text += character;
        index++;
      }
      tokens.push({ text, type: "space" });
      continue;
    }

    if (currentCharacter === '"') {
      let text = '"';

      index++;
      while (index < json.length) {
        const character = json[index];
        if (!character || character === '"') break;
        if (character === "\\") {
          text += character;
          index++;
        }
        const escapedCharacter = json[index];
        if (!escapedCharacter) break;
        text += escapedCharacter;
        index++;
      }

      text += '"';
      index++;
      let lookahead = index;

      while (lookahead < json.length) {
        const character = json[lookahead];
        if (!character || !/\s/.test(character)) break;
        lookahead++;
      }

      tokens.push({ text, type: json[lookahead] === ":" ? "key" : "string" });
      continue;
    }

    if (/[-\d]/.test(currentCharacter)) {
      let text = "";
      while (index < json.length) {
        const character = json[index];
        if (!character || !/[-\d.eE+]/.test(character)) break;
        text += character;
        index++;
      }
      tokens.push({ text, type: "number" });
      continue;
    }

    if (json.startsWith("true", index) || json.startsWith("false", index)) {
      const word = json.startsWith("true", index) ? "true" : "false";
      tokens.push({ text: word, type: "boolean" });
      index += word.length;
      continue;
    }

    if (json.startsWith("null", index)) {
      tokens.push({ text: "null", type: "null" });
      index += 4;
      continue;
    }

    tokens.push({ text: currentCharacter, type: "punct" });
    index++;
  }

  return tokens;
};

const JsonPreview = ({ data }: { data: unknown }) => {
  const json = JSON.stringify(data, null, 2);

  return (
    <pre className="max-h-128 overflow-auto bg-background-rich px-4 py-4 font-mono text-xs leading-relaxed sm:px-5">
      <code>
        {tokenizeJson(json).map((token, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable token order
          <span key={index} className={tokenColor[token.type]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
};

const ServicesSection = ({
  services,
}: {
  services: UcpCheck.ParsedService[];
}) => {
  if (services.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title="Services & transports"
        description="Endpoint surfaces an agent can negotiate against. Each entry maps to a reverse-domain service key in the profile."
      />
      <div className="divide-y divide-accent-foreground">
        {services.map((service, index) => (
          <div
            key={`${service.name}-${service.transport ?? "no-transport"}-${service.endpoint ?? index}`}
            className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] md:items-start"
          >
            <div>
              <div className="flex items-center gap-2">
                <CodeIcon className="size-3.5 text-foreground-dimmed" />
                <p className="font-medium text-foreground text-sm">
                  {service.label}
                </p>
              </div>
              <p className="mt-1 break-all font-mono text-foreground-dimmed text-xs">
                {service.name}
              </p>
              {!service.recognized && (
                <p className="mt-2 font-light text-foreground-dimmed text-xs">
                  Custom service key — not one of the known UCP service
                  identifiers.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <StatusChip
                  label={`Transport · ${formatTransport(service.transport)}`}
                  tone={service.transport ? "success" : "danger"}
                />
                <StatusChip
                  label={`Version · ${service.version ?? "Missing"}`}
                  tone={service.version ? "success" : "danger"}
                />
              </div>
              {service.endpoint && (
                <p className="break-all font-light text-foreground-dimmed text-xs">
                  <span className="font-medium text-foreground-dimmed">
                    Endpoint:
                  </span>{" "}
                  <span className="font-mono text-foreground">
                    {service.endpoint}
                  </span>
                </p>
              )}
              {service.schema && (
                <p className="break-all font-light text-foreground-dimmed text-xs">
                  <span className="font-medium text-foreground-dimmed">
                    Schema:
                  </span>{" "}
                  <span className="font-mono text-foreground">
                    {service.schema}
                  </span>
                </p>
              )}
            </div>

            <StatusChip
              label={service.recognized ? "Recognized" : "Custom"}
              tone={service.recognized ? "success" : "warning"}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const CapabilitiesSection = ({
  capabilities,
}: {
  capabilities: UcpCheck.ParsedCapability[];
}) => {
  if (capabilities.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title="Capabilities"
        description="Discrete flows the storefront supports. Order, checkout and cart are required for transactional agents."
      />
      <div className="divide-y divide-accent-foreground">
        {capabilities.map((capability, index) => {
          const configKeys = capability.config
            ? Object.keys(capability.config)
            : [];

          return (
            <div
              key={`${capability.name}-${capability.version ?? "no-version"}-${capability.spec ?? capability.schema ?? index}`}
              className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] md:items-start"
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {capability.label}
                </p>
                <p className="mt-1 break-all font-mono text-foreground-dimmed text-xs">
                  {capability.name}
                </p>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label={`Version · ${capability.version ?? "Missing"}`}
                    tone={capability.version ? "success" : "danger"}
                  />
                  {capability.spec && (
                    <StatusChip label="spec linked" tone="success" />
                  )}
                  {capability.schema && (
                    <StatusChip label="schema linked" tone="success" />
                  )}
                </div>
                {configKeys.length > 0 && (
                  <div className="font-light text-foreground-dimmed text-xs">
                    <span className="font-medium text-foreground-dimmed">
                      Config:
                    </span>{" "}
                    <span className="font-mono text-foreground">
                      {configKeys.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              <StatusChip
                label={capability.recognized ? "Known" : "Custom"}
                tone={capability.recognized ? "success" : "warning"}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PaymentHandlersSection = ({
  paymentHandlers,
}: {
  paymentHandlers: UcpCheck.ParsedPaymentHandler[];
}) => {
  if (paymentHandlers.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title="Payment handlers"
        description="Tokenization endpoints declared by the merchant. Each handler must declare a version and any required handler IDs."
      />
      <div className="grid gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-3">
        {paymentHandlers.map((handler, index) => (
          <div
            key={`${handler.registryKey}-${handler.id ?? handler.version ?? index}`}
            className="bg-background px-4 py-4"
          >
            <p className="font-medium text-foreground text-sm">
              {handler.label}
            </p>
            <p className="mt-1 break-all font-mono text-foreground-dimmed text-xs">
              {handler.registryKey}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip
                label={`Version · ${handler.version ?? "Missing"}`}
                tone={handler.version ? "success" : "warning"}
              />
              {handler.id && (
                <StatusChip label={`ID · ${handler.id}`} tone="success" />
              )}
              <StatusChip
                label={handler.recognized ? "Known" : "Custom"}
                tone={handler.recognized ? "success" : "warning"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SigningKeysSection = ({
  signingKeys,
  advertised,
}: {
  signingKeys: UcpCheck.ParsedSigningKey[];
  advertised: boolean;
}) => (
  <div className="border-accent-foreground border-t">
    <SectionHeading
      title="Signing keys & authentication"
      description="RFC 9421 HTTP Message Signatures are the basis of permissionless onboarding. Every request must be verifiable against a public JWK published here."
    />
    {!advertised ? (
      <div className="bg-background px-4 py-5">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-yellow-500" />
          <StatusChip label="signing_keys not advertised" tone="warning" />
        </div>
        <p className="mt-3 max-w-2xl font-light text-foreground-dimmed text-sm">
          The profile does not advertise any signing keys, so platforms cannot
          verify RFC 9421 HTTP message signatures without an out-of-band secret
          exchange. UCP allows this, but agents will fall back to traditional
          auth (API keys, OAuth, mTLS).
        </p>
      </div>
    ) : signingKeys.length === 0 ? (
      <div className="bg-background px-4 py-5">
        <StatusChip label="signing_keys is empty" tone="warning" />
      </div>
    ) : (
      <div className="divide-y divide-accent-foreground">
        {signingKeys.map((key, index) => {
          const hasIssue =
            !key.kid ||
            !key.kty ||
            (key.kty === "EC" && !key.crv) ||
            key.hasPrivateMaterial;

          return (
            <div
              key={`${key.kid ?? `no-kid-${index}`}-${key.alg ?? key.kty ?? "unknown"}`}
              className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] md:items-start"
            >
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon
                    className={cn(
                      "size-3.5",
                      hasIssue ? "text-red-500" : "text-primary",
                    )}
                  />
                  <p className="font-medium font-mono text-foreground text-sm">
                    {key.kid ?? "(missing kid)"}
                  </p>
                </div>
                <p className="mt-1 font-light text-foreground-dimmed text-xs">
                  {key.hasPrivateMaterial
                    ? "Contains private material — must be removed."
                    : "Public JWK"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusChip
                  label={`kty · ${key.kty ?? "Missing"}`}
                  tone={key.kty ? "success" : "danger"}
                />
                <StatusChip
                  label={`use · ${key.use ?? "Missing"}`}
                  tone={key.use === "sig" ? "success" : "warning"}
                />
                <StatusChip
                  label={`alg · ${key.alg ?? "Missing"}`}
                  tone={key.alg ? "success" : "warning"}
                />
                {key.kty === "EC" && (
                  <StatusChip
                    label={`crv · ${key.crv ?? "Missing"}`}
                    tone={key.crv ? "success" : "danger"}
                  />
                )}
              </div>

              <StatusChip
                label={hasIssue ? "Issues" : "Valid"}
                tone={hasIssue ? "danger" : "success"}
              />
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const SupportedVersionsSection = ({
  supportedVersions,
}: {
  supportedVersions: UcpCheck.ParsedSupportedVersion[];
}) => {
  if (supportedVersions.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title="Supported versions"
        description="Profile URIs for every protocol version this merchant still serves. Agents pick the highest version they understand."
      />
      <div className="divide-y divide-accent-foreground">
        {supportedVersions.map((version) => (
          <div
            key={version.version}
            className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto] md:items-center"
          >
            <p className="font-medium font-mono text-foreground text-sm">
              {version.version}
            </p>
            <p className="break-all font-mono text-foreground-dimmed text-xs">
              {version.uri || "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              {version.isCurrent && (
                <StatusChip label="Current" tone="success" />
              )}
              <StatusChip
                label={version.isHttps ? "HTTPS" : "Insecure"}
                tone={version.isHttps ? "success" : "danger"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SpecIssuesSection = ({ issues }: { issues: UcpCheck.SpecIssue[] }) => {
  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  const grouped = ISSUE_CATEGORY_ORDER.flatMap((category) => {
    const matching = issues.filter((issue) => issue.category === category);
    if (matching.length === 0) return [];
    return [{ category, issues: matching }];
  });

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title="Spec validation"
        description={`${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warningCount} warning${warningCount !== 1 ? "s" : ""} grouped by spec area.`}
      />

      {issues.length === 0 ? (
        <div className="bg-background px-4 py-5">
          <StatusChip label="No issues found" tone="success" />
          <p className="mt-3 max-w-2xl font-light text-foreground-dimmed text-sm">
            The current profile passed the validator without schema errors or
            warnings.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-accent-foreground">
          {grouped.map((group) => (
            <div key={group.category} className="bg-background">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-[0.18em]">
                  {ISSUE_CATEGORY_LABELS[group.category]} ·{" "}
                  <span className="text-foreground-dimmed">
                    {group.issues.length}
                  </span>
                </p>
              </div>
              <div className="divide-y divide-accent-foreground">
                {group.issues.map((issue) => (
                  <div
                    key={`${issue.severity}-${issue.field}-${issue.message}`}
                    className="grid gap-4 px-4 py-3 md:grid-cols-[auto_minmax(0,260px)_minmax(0,1fr)] md:items-start"
                  >
                    <StatusChip
                      label={issue.severity === "error" ? "Error" : "Warning"}
                      tone={issue.severity === "error" ? "danger" : "warning"}
                    />
                    <p className="break-all font-mono text-foreground-dimmed text-xs">
                      {issue.field}
                    </p>
                    <p className="text-foreground text-sm">{issue.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Results = ({ result }: { result: UcpCheck.UcpCheckResult }) => {
  const errorCount = result.specIssues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const allowedBotCount = result.robots.filter((bot) => bot.allowed).length;
  const recognizedCapabilities = result.capabilities.filter(
    (capability) => capability.recognized,
  ).length;
  const overallPass =
    result.https &&
    result.found &&
    result.valid &&
    errorCount === 0 &&
    allowedBotCount === result.robots.length;

  return (
    <Motion.Up className="border-accent-foreground border-t">
      <div className="grid gap-px bg-accent-foreground xl:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,0.78fr))]">
        <div className="bg-background px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">
                {result.domain}
              </p>
              <p className="mt-1 truncate font-mono text-foreground-dimmed text-xs">
                {result.url}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {result.ucpVersion && (
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-1 font-mono text-xs",
                    result.isLatestVersion
                      ? "bg-primary/10 text-primary"
                      : "bg-yellow-500/10 text-yellow-500",
                  )}
                >
                  v{result.ucpVersion}
                  {!result.isLatestVersion && (
                    <span className="ml-2 text-foreground-dimmed">
                      (latest: {LATEST_UCP_VERSION})
                    </span>
                  )}
                </span>
              )}
              {result.envelopeKind && (
                <span className="inline-flex items-center bg-accent-foreground px-2 py-1 font-mono text-foreground-dimmed text-xs">
                  {result.envelopeKind === "wrapped"
                    ? "envelope: ucp{}"
                    : "envelope: flat"}
                </span>
              )}
              <StatusChip
                label={overallPass ? "UCP Ready" : "Needs fixes"}
                tone={overallPass ? "success" : "danger"}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium text-foreground-dimmed text-xs uppercase tracking-[0.18em]">
                Response health
              </p>
              <p className="mt-1 font-light text-foreground-dimmed text-sm">
                {result.error ??
                  "Endpoint responded and the profile could be evaluated."}
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground-dimmed text-xs uppercase tracking-[0.18em]">
                Detected surface
              </p>
              <p className="mt-1 font-light text-foreground-dimmed text-sm">
                {result.services.length} service
                {result.services.length !== 1 ? "s" : ""},{" "}
                {result.capabilities.length} capabilit
                {result.capabilities.length !== 1 ? "ies" : "y"},{" "}
                {result.paymentHandlers.length} payment handler
                {result.paymentHandlers.length !== 1 ? "s" : ""},{" "}
                {result.signingKeys.length} signing key
                {result.signingKeys.length !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>
        </div>

        <SummaryCard
          label="Latency"
          value={formatLatency(result.latencyMs)}
          detail={
            result.latencyMs === null
              ? "We could not measure a live response time."
              : "Response time for the UCP endpoint."
          }
          tone={result.latencyMs === null ? "danger" : "success"}
        />

        <SummaryCard
          label="Spec Errors"
          value={String(errorCount)}
          detail={
            errorCount === 0
              ? "No blocking schema issues found."
              : "Blocking issues that should be fixed first."
          }
          tone={errorCount > 0 ? "danger" : "success"}
        />

        <SummaryCard
          label="Capabilities"
          value={`${recognizedCapabilities}/${result.capabilities.length || 0}`}
          detail={
            result.capabilities.length === 0
              ? "No capabilities declared."
              : "Recognized vs. total declared capabilities."
          }
          tone={(() => {
            switch (true) {
              case result.capabilities.length === 0:
                return "warning";
              case recognizedCapabilities === result.capabilities.length:
                return "success";
              default:
                return "warning";
            }
          })()}
        />

        <SummaryCard
          label="Bot Access"
          value={`${allowedBotCount}/${result.robots.length}`}
          detail="Major shopping and indexing bots allowed in robots.txt."
          tone={
            allowedBotCount === result.robots.length ? "success" : "warning"
          }
        />
      </div>

      <div className="border-accent-foreground border-t">
        <SectionHeading
          title="Core checks"
          description="These checks confirm that the public profile is reachable, secure, and machine-readable."
        />

        <div className="divide-y divide-accent-foreground">
          <CheckRow
            label="HTTPS"
            passed={result.https}
            detail="The domain must be served over a secure HTTPS connection."
          />
          <CheckRow
            label="/.well-known/ucp exists"
            passed={result.found}
            detail={
              result.found
                ? result.httpStatus !== null
                  ? `HTTP ${result.httpStatus}${result.valid ? "" : " (body is not JSON)"}.`
                  : "Endpoint responded."
                : (result.error ?? "No response at /.well-known/ucp.")
            }
          />
          <CheckRow
            label="Valid JSON"
            passed={result.valid}
            detail={
              result.valid
                ? `Content-Type: ${result.contentType ?? "—"}${result.httpStatus !== null ? ` · HTTP ${result.httpStatus}` : ""}`
                : (result.error ?? "Response body is not valid JSON.")
            }
          />
          <CheckRow
            label="Website latency"
            passed={result.latencyMs !== null}
            detail={
              result.latencyMs === null
                ? "Latency could not be measured because the endpoint did not respond."
                : `The UCP endpoint responded in ${formatLatency(result.latencyMs)}.`
            }
          />
          <CheckRow
            label="Latest protocol version"
            passed={result.isLatestVersion}
            detail={
              result.ucpVersion
                ? result.isLatestVersion
                  ? `Profile declares ${result.ucpVersion} — the latest published UCP version.`
                  : `Profile declares ${result.ucpVersion}; latest is ${LATEST_UCP_VERSION}.`
                : "No version declared at the profile root."
            }
          />
          <CheckRow
            label="Signing keys advertised"
            passed={
              result.signingKeysAdvertised && result.signingKeys.length > 0
            }
            detail={
              result.signingKeysAdvertised
                ? `${result.signingKeys.length} JWK${result.signingKeys.length !== 1 ? "s" : ""} published for RFC 9421 verification.`
                : "No signing_keys advertised — permissionless verification not possible."
            }
          />
        </div>
      </div>

      <ServicesSection services={result.services} />
      <CapabilitiesSection capabilities={result.capabilities} />
      <PaymentHandlersSection paymentHandlers={result.paymentHandlers} />
      <SigningKeysSection
        signingKeys={result.signingKeys}
        advertised={result.signingKeysAdvertised}
      />
      <SupportedVersionsSection supportedVersions={result.supportedVersions} />

      <div className="border-accent-foreground border-t">
        <SectionHeading
          title="AI agent access"
          description="Based on the current robots.txt rules for the site."
        />

        <div className="divide-y divide-accent-foreground">
          {result.robots.map((bot) => (
            <div
              key={bot.botId}
              className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] md:items-center"
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {bot.label}
                </p>
                <p className="mt-1 font-mono text-foreground-dimmed text-xs">
                  {bot.botId}
                </p>
              </div>

              <p className="font-light text-foreground-dimmed text-sm">
                {bot.description}
              </p>

              <StatusChip
                label={bot.allowed ? "Allowed" : "Blocked"}
                tone={bot.allowed ? "success" : "danger"}
              />
            </div>
          ))}
        </div>
      </div>

      <SpecIssuesSection issues={result.specIssues} />

      {result.valid && result.data !== null && (
        <div className="border-accent-foreground border-t">
          <SectionHeading
            title="UCP response"
            description="Syntax-highlighted JSON preview of the live well-known document."
          />
          <JsonPreview data={result.data} />
        </div>
      )}
    </Motion.Up>
  );
};

export const UcpValidatorForm = () => {
  const toast = useToastManager();
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<UcpCheck.UcpCheckResult | null>(null);

  const [handleCheck, isChecking] = useAsyncAction(async () => {
    const response = await UcpCheck.checkUCP(domain);

    if (!response.success) {
      toast.add({
        title: "Check failed",
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
      <div className="grid border-accent-foreground border-b lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-accent-foreground px-8 py-8 lg:border-r">
          <h2 className="font-body text-2xl text-foreground">
            Run a live validation
          </h2>
          <p className="mt-2 max-w-2xl font-light text-foreground-dimmed">
            Paste a domain and we&apos;ll fetch the live{" "}
            <span className="font-mono text-foreground text-sm">
              /.well-known/ucp
            </span>{" "}
            document, parse every service, capability, payment handler and
            signing key, then validate it against the{" "}
            <span className="font-mono text-foreground text-sm">
              {LATEST_UCP_VERSION}
            </span>{" "}
            spec.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <label
              htmlFor="ucp-domain"
              className="block font-medium text-foreground-dimmed text-xs uppercase tracking-[0.16em]"
            >
              Domain
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <TextField
                value={domain}
                onValueChange={setDomain}
                className="h-11 flex-1"
              >
                <TextFieldInput
                  id="ucp-domain"
                  placeholder="yourdomain.com"
                  className="px-4"
                />
              </TextField>
              <Button
                type="submit"
                color="primary"
                disabled={isChecking || !domain.trim()}
                className="h-11 shrink-0 justify-center px-6"
              >
                {isChecking ? "Checking..." : "Check domain"}
              </Button>
            </div>
            <p className="mt-3 font-light text-foreground-dimmed text-sm">
              Root domain only —{" "}
              <span className="font-mono text-foreground">acme.com</span> or{" "}
              <span className="font-mono text-foreground">www.acme.com</span>.
              We always validate the HTTPS version.
            </p>
          </form>
        </div>

        <div className="bg-background-dimmed px-8 py-8">
          <p className="font-medium text-foreground-dimmed text-xs uppercase tracking-[0.16em]">
            Before you run it
          </p>
          <div className="mt-5 flex flex-col gap-5">
            {notes.map((note) => (
              <div
                key={note.title}
                className="border-accent-foreground border-t pt-5 first:border-t-0 first:pt-0"
              >
                <p className="font-medium text-foreground text-sm">
                  {note.title}
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm leading-relaxed">
                  {note.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result && <Results result={result} />}
    </div>
  );
};
