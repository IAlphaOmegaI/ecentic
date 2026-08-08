"use client";

import {
  CheckCircleIcon,
  CheckIcon,
  CodeIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { type SubmitEvent, useState } from "react";
import { StatusPill } from "@/app/(main)/dashboard/_components/grid";
import { Reveal, RevealItem } from "@/components/reveal";
import { Fade } from "@/lib/animations";
import ucp from "@/public/images/ucp.png";
import * as UcpCheck from "@/server/app/intelligence/ucp/check";

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

const validationTargets = [
  {
    label: "HTTPS & reachability",
    detail: "Served over TLS and responding to live requests.",
  },
  {
    label: "Profile discovery",
    code: "/.well-known/ucp",
    detail: "The live discovery document agents fetch on your domain.",
  },
  {
    label: "Services & transports",
    code: "REST · MCP · A2A",
    detail: "Endpoint surfaces agents negotiate against.",
  },
  {
    label: "Capabilities",
    code: "dev.ucp.shopping.*",
    detail: "Cart, checkout, and order flows the storefront declares.",
  },
  {
    label: "Payment handlers",
    code: "payment.handlers[]",
    detail: "Tokenization endpoints and their declared versions.",
  },
  {
    label: "Signing keys",
    code: "signing_keys · RFC 9421",
    detail: "Public JWKs for HTTP message signature verification.",
  },
  {
    label: "Supported versions",
    code: "supported_versions[]",
    detail: "Every protocol version the merchant still serves.",
  },
  {
    label: "Agent access",
    code: "robots.txt",
    detail: "Shopping and indexing agents are not blocked.",
  },
] as const;

const submitButtonClassName =
  "w-full shrink-0 sm:min-w-36 sm:w-36 justify-center";

const previewHost = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "yourdomain.com";
  return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
};

const DomainCheckPreview = ({ domain }: DomainCheckPreview.Props) => {
  const host = previewHost(domain);

  return (
    <div className="relative flex h-full min-h-48 flex-col justify-center overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-radial-[at_0%_100%] from-primary/15 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 h-32 w-32 bg-radial-[at_100%_0%] from-primary/10 to-transparent"
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Image
            src={ucp}
            alt="Universal Commerce Protocol logo"
            className="size-10 object-contain"
          />
          <div>
            <p className="font-medium text-foreground text-sm">Live fetch</p>
            <p className="mt-0.5 font-mono text-foreground-dimmed text-xs">
              HTTPS · spec {LATEST_UCP_VERSION}
            </p>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-md border border-accent-foreground bg-background-rich/80 p-4 font-mono text-foreground-dimmed text-xs leading-relaxed backdrop-blur-[2px] sm:text-sm">
          {`GET /.well-known/ucp HTTP/1.1
Host: ${host}
Accept: application/json
UCP-Agent: profile="https://ucp.dev/..."`}
        </pre>
        <p className="font-light text-foreground-dimmed text-sm leading-relaxed">
          We request the public profile, parse services and capabilities, then
          surface spec issues and agent access from robots.txt.
        </p>
      </div>
    </div>
  );
};

export namespace DomainCheckPreview {
  export type Props = {
    domain: string;
  };
}

const validationManifestArt = `GET /.well-known/ucp HTTP/1.1
Host: store.example.com
Accept: application/json
UCP-Agent: profile="https://ucp.dev/..."

HTTP/1.1 200 OK
Content-Type: application/json

{
  "ucp": {
    "version": "2026-04-08",
    "services": {
      "dev.ucp.shopping": [ ... ]
    },
    "capabilities": {
      "dev.ucp.shopping.cart": [ ... ],
      "dev.ucp.shopping.checkout": [ ... ]
    },
    "signing_keys": [ { "kty": "EC", ... } ],
    "payment_handlers": { ... }
  }
}`;

const ValidationTargetsSection = () => (
  <div className="relative overflow-hidden border-accent-foreground border-t bg-primary/5">
    <pre
      aria-hidden
      className="pointer-events-none absolute top-0 right-0 hidden h-40 max-w-lg select-none overflow-hidden whitespace-pre p-5 text-right font-mono text-primary/20 text-sm leading-snug md:block lg:h-48 lg:max-w-xl lg:text-base lg:text-primary/25"
    >
      {validationManifestArt}
    </pre>
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-radial-[at_100%_0%] from-primary/15 via-transparent to-transparent md:h-48"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent"
    />
    <div className="relative">
      <div className="px-6 pt-6 pb-3 sm:px-8">
        <p className="font-medium text-primary text-sm">What we validate</p>
      </div>
      <Reveal className="relative grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-4">
        {validationTargets.map((target) => (
          <RevealItem
            key={target.label}
            className="flex flex-col gap-2 bg-background-rich/95 px-4 py-4 backdrop-blur-[2px] sm:px-5"
          >
            <div className="flex items-center gap-2">
              <CheckIcon className="size-3.5 shrink-0 text-primary" />
              <p className="font-medium text-foreground text-sm leading-snug">
                {target.label}
              </p>
            </div>
            {"code" in target && target.code ? (
              <p className="truncate font-mono text-primary text-xs">
                {target.code}
              </p>
            ) : null}
          </RevealItem>
        ))}
      </Reveal>
    </div>
  </div>
);

const toneClassList: Record<Tone, string> = {
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-error/20 bg-error/10 text-error",
  warning: "border-warning/20 bg-warning/10 text-warning",
  neutral: "border-accent-foreground bg-background text-foreground-dimmed",
};

const statusPillTone = (
  tone: Tone,
): "success" | "warning" | "error" | "neutral" => {
  switch (tone) {
    case "success":
      return "success";
    case "danger":
      return "error";
    case "warning":
      return "warning";
    case "neutral":
      return "neutral";
    default: {
      const exhaustive: never = tone;
      return exhaustive;
    }
  }
};

const ValidationBadge = ({ label, tone }: { label: string; tone: Tone }) => (
  <StatusPill tone={statusPillTone(tone)}>{label}</StatusPill>
);

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
    <p className="font-medium text-primary text-sm">{label}</p>
    <div>
      <p
        className={cn(
          "font-medium text-2xl text-foreground",
          tone === "success" && "text-success",
          tone === "danger" && "text-error",
          tone === "warning" && "text-warning",
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

      <ValidationBadge label={passed ? "Pass" : "Fail"} tone={tone} />
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
                <ValidationBadge
                  label={`Transport · ${formatTransport(service.transport)}`}
                  tone={service.transport ? "success" : "danger"}
                />
                <ValidationBadge
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

            <ValidationBadge
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
                  <ValidationBadge
                    label={`Version · ${capability.version ?? "Missing"}`}
                    tone={capability.version ? "success" : "danger"}
                  />
                  {capability.spec && (
                    <ValidationBadge label="spec linked" tone="success" />
                  )}
                  {capability.schema && (
                    <ValidationBadge label="schema linked" tone="success" />
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

              <ValidationBadge
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
              <ValidationBadge
                label={`Version · ${handler.version ?? "Missing"}`}
                tone={handler.version ? "success" : "warning"}
              />
              {handler.id && (
                <ValidationBadge label={`ID · ${handler.id}`} tone="success" />
              )}
              <ValidationBadge
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
          <ShieldCheckIcon className="size-4 text-warning" />
          <ValidationBadge label="signing_keys not advertised" tone="warning" />
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
        <ValidationBadge label="signing_keys is empty" tone="warning" />
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
                      hasIssue ? "text-error" : "text-success",
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
                <ValidationBadge
                  label={`kty · ${key.kty ?? "Missing"}`}
                  tone={key.kty ? "success" : "danger"}
                />
                <ValidationBadge
                  label={`use · ${key.use ?? "Missing"}`}
                  tone={key.use === "sig" ? "success" : "warning"}
                />
                <ValidationBadge
                  label={`alg · ${key.alg ?? "Missing"}`}
                  tone={key.alg ? "success" : "warning"}
                />
                {key.kty === "EC" && (
                  <ValidationBadge
                    label={`crv · ${key.crv ?? "Missing"}`}
                    tone={key.crv ? "success" : "danger"}
                  />
                )}
              </div>

              <ValidationBadge
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
                <ValidationBadge label="Current" tone="success" />
              )}
              <ValidationBadge
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
          <ValidationBadge label="No issues found" tone="success" />
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
                <p className="font-medium text-foreground text-sm">
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
                    <ValidationBadge
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
    <motion.div
      variants={Fade.Up}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="border-accent-foreground border-t"
    >
      <div className="border-accent-foreground border-b bg-background-rich px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-lg">
              {result.domain}
            </p>
            <p className="mt-1 break-all font-mono text-foreground-dimmed text-sm">
              {result.url}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {result.ucpVersion && (
              <StatusPill
                tone={result.isLatestVersion ? "success" : "warning"}
                className="font-mono normal-case tracking-normal"
              >
                v{result.ucpVersion}
                {!result.isLatestVersion && ` · latest ${LATEST_UCP_VERSION}`}
              </StatusPill>
            )}
            {result.envelopeKind && (
              <StatusPill
                tone="neutral"
                className="font-mono normal-case tracking-normal"
              >
                {result.envelopeKind === "wrapped"
                  ? "envelope: ucp{}"
                  : "envelope: flat"}
              </StatusPill>
            )}
            <ValidationBadge
              label={overallPass ? "UCP ready" : "Needs fixes"}
              tone={overallPass ? "success" : "danger"}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-medium text-primary text-sm">Response health</p>
            <p className="mt-1 font-light text-foreground-dimmed text-sm leading-relaxed">
              {result.error ??
                "Endpoint responded and the profile could be evaluated."}
            </p>
          </div>

          <div>
            <p className="font-medium text-primary text-sm">Detected surface</p>
            <p className="mt-1 font-light text-foreground-dimmed text-sm leading-relaxed">
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

      <div className="grid grid-cols-2 gap-px bg-accent-foreground lg:grid-cols-4">
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

              <ValidationBadge
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
    </motion.div>
  );
};

export const UcpValidatorForm = ({
  hideIntro = false,
}: UcpValidatorForm.Props) => {
  const toast = useToastManager();
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<UcpCheck.UcpCheckResult | null>(null);
  const [run, setRun] = useState(0);

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
    setRun((previous) => previous + 1);
  });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCheck();
  };

  return (
    <div className="flex flex-col">
      {hideIntro ? (
        <div className="grid grid-cols-1 gap-px bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <div className="bg-background-dimmed p-6 sm:p-8">
            <DomainCheckPreview domain={domain} />
          </div>
          <div className="flex flex-col justify-center bg-background-rich px-6 py-6 sm:px-8 sm:py-8">
            <form onSubmit={handleSubmit}>
              <p className="font-medium text-primary text-sm">Check a domain</p>
              <label
                htmlFor="ucp-domain"
                className="mt-3 block font-medium text-foreground text-sm"
              >
                Storefront domain
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <TextField
                  value={domain}
                  onValueChange={setDomain}
                  className="flex-1"
                >
                  <TextFieldInput
                    id="ucp-domain"
                    placeholder="yourdomain.com"
                  />
                </TextField>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isChecking || !domain.trim()}
                  className={submitButtonClassName}
                >
                  {isChecking ? "Checking..." : "Check domain"}
                </Button>
              </div>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                Root domain only —{" "}
                <span className="font-mono text-foreground">acme.com</span> or{" "}
                <span className="font-mono text-foreground">www.acme.com</span>.
                We always validate the HTTPS version.
              </p>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="font-medium text-primary text-sm">Live validation</p>
            <h2 className="mt-2 font-body font-medium text-3xl text-foreground md:text-4xl">
              Run a live validation
            </h2>
            <p className="mt-3 font-light text-foreground-dimmed text-lg leading-relaxed">
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
          </div>

          <div className="flex flex-col justify-center border-accent-foreground border-t px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="ucp-domain"
                className="block font-medium text-foreground text-sm"
              >
                Domain
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <TextField
                  value={domain}
                  onValueChange={setDomain}
                  className="flex-1"
                >
                  <TextFieldInput
                    id="ucp-domain"
                    placeholder="yourdomain.com"
                  />
                </TextField>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isChecking || !domain.trim()}
                  className={submitButtonClassName}
                >
                  {isChecking ? "Checking..." : "Check domain"}
                </Button>
              </div>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                Root domain only —{" "}
                <span className="font-mono text-foreground">acme.com</span> or{" "}
                <span className="font-mono text-foreground">www.acme.com</span>.
                We always validate the HTTPS version.
              </p>
            </form>
          </div>
        </div>
      )}

      <ValidationTargetsSection />

      <AnimatePresence mode="wait" initial={false}>
        {result && <Results key={run} result={result} />}
      </AnimatePresence>
    </div>
  );
};

export namespace UcpValidatorForm {
  export type Props = {
    hideIntro?: boolean;
  };
}
