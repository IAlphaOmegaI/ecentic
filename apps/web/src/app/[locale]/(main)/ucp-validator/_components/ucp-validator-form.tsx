"use client";

import {
  CheckCircleIcon,
  CheckIcon,
  CircleMinusIcon,
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
import { useTranslations } from "next-intl";
import { type SubmitEvent, useState } from "react";
import { StatusPill } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { Reveal, RevealItem } from "@/components/reveal";
import { Fade } from "@/lib/animations";
import { LATEST_UCP_VERSION, UCP_REVISIONS } from "@/lib/ucp";
import ucp from "@/public/images/ucp.png";
import * as UcpCheck from "@/server/app/intelligence/ucp/check";

type JToken = {
  text: string;
  type: "key" | "string" | "number" | "boolean" | "null" | "punct" | "space";
};

type Tone = "success" | "danger" | "warning" | "neutral";

/** Every sub-component here reads the same namespace; hoisting the type keeps
 * the helpers that take a translator honest about which namespace they need. */
type Translate = ReturnType<typeof useTranslations<"ucpValidator.form">>;

const issueCategoryLabel = (
  category: UcpCheck.SpecIssueCategory,
  translate: Translate,
) => translate(`issueCategory.${category}`);

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

// Only the code samples are locale-independent; label and detail come from the
// catalog under `targets.<key>`.
const validationTargets = [
  { key: "https" },
  { key: "discovery", code: "/.well-known/ucp" },
  { key: "services", code: "REST · MCP · A2A" },
  { key: "capabilities", code: "dev.ucp.shopping.*" },
  { key: "paymentHandlers", code: "payment.handlers[]" },
  { key: "signingKeys", code: "keys[] · RFC 9421" },
  { key: "supportedVersions", code: "supported_versions[]" },
  { key: "agentAccess", code: "robots.txt" },
] as const;

const submitButtonClassName =
  "w-full shrink-0 sm:min-w-36 sm:w-36 justify-center";

const previewHost = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "yourdomain.com";
  return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
};

const DomainCheckPreview = ({ domain }: DomainCheckPreview.Props) => {
  const translate = useTranslations("ucpValidator.form");
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
            alt={translate("preview.logoAlt")}
            className="size-10 object-contain"
          />
          <div>
            <p className="font-medium text-foreground text-sm">
              {translate("preview.liveFetch")}
            </p>
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
          {translate("preview.note")}
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
    "version": "${LATEST_UCP_VERSION}",
    "services": {
      "dev.ucp.shopping": [ ... ]
    },
    "capabilities": {
      "dev.ucp.shopping.cart": [ ... ],
      "dev.ucp.shopping.checkout": [ ... ]
    },
    "payment_handlers": { ... }
  },
  "keys": [ { "kty": "EC", ... } ]
}`;

const ValidationTargetsSection = () => {
  const translate = useTranslations("ucpValidator.form");

  return (
    <div className="relative overflow-hidden border-accent-foreground border-t bg-primary/5">
      <pre
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 hidden h-40 max-w-lg select-none overflow-hidden whitespace-pre p-5 text-right font-mono text-primary-text/20 text-sm leading-snug md:block lg:h-48 lg:max-w-xl lg:text-base lg:text-primary-text/25"
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
          <p className="font-medium text-primary-text text-sm">
            {translate("targets.title")}
          </p>
        </div>
        <Reveal className="relative grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-4">
          {validationTargets.map((target) => (
            <RevealItem
              key={target.key}
              className="flex flex-col gap-2 bg-background-rich/95 px-4 py-4 backdrop-blur-[2px] sm:px-5"
            >
              <div className="flex items-center gap-2">
                <CheckIcon className="size-3.5 shrink-0 text-primary" />
                <p className="font-medium text-foreground text-sm leading-snug">
                  {translate(`targets.${target.key}.label`)}
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
};

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

const formatLatency = (
  latencyMs: number | null,
  translate: Translate,
): string =>
  latencyMs === null ? translate("badge.unavailable") : `${latencyMs} ms`;

const formatTransport = (
  transport: string | null,
  translate: Translate,
): string => {
  if (!transport) return "—";
  switch (transport) {
    case "rest":
      return "REST";
    case "mcp":
      return "MCP";
    case "a2a":
      return "A2A";
    case "embedded":
      return translate("badge.embedded");
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
    <p className="font-medium text-primary-text text-sm">{label}</p>
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
  skipped = false,
  detail,
}: {
  label: string;
  passed: boolean;
  /** The check was not run, which is neither a pass nor a fail. */
  skipped?: boolean;
  detail?: string | null;
}) => {
  const translate = useTranslations("ucpValidator.form");
  const tone: Tone = (() => {
    switch (true) {
      case skipped:
        return "neutral";
      case passed:
        return "success";
      default:
        return "danger";
    }
  })();
  const Icon = (() => {
    switch (true) {
      case skipped:
        return CircleMinusIcon;
      case passed:
        return CheckCircleIcon;
      default:
        return XCircleIcon;
    }
  })();

  return (
    <div className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-center">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center border",
            toneClassList[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <p className="font-medium text-foreground text-sm">{label}</p>
      </div>

      <p className="font-light text-foreground-dimmed text-sm">
        {detail ?? "—"}
      </p>

      <ValidationBadge
        label={(() => {
          switch (true) {
            case skipped:
              return translate("badge.notValidated");
            case passed:
              return translate("badge.pass");
            default:
              return translate("badge.fail");
          }
        })()}
        tone={tone}
      />
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
  const translate = useTranslations("ucpValidator.form");

  if (services.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title={translate("services.title")}
        description={translate("services.description")}
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
                  {translate("services.customNote")}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <ValidationBadge
                  label={translate("badge.transport", {
                    value: formatTransport(service.transport, translate),
                  })}
                  tone={service.transport ? "success" : "danger"}
                />
                <ValidationBadge
                  label={translate("badge.version", {
                    value: service.version ?? translate("badge.missing"),
                  })}
                  tone={service.version ? "success" : "danger"}
                />
              </div>
              {service.endpoint && (
                <p className="break-all font-light text-foreground-dimmed text-xs">
                  <span className="font-medium text-foreground-dimmed">
                    {translate("services.endpointLabel")}
                  </span>{" "}
                  <span className="font-mono text-foreground">
                    {service.endpoint}
                  </span>
                </p>
              )}
              {service.schema && (
                <p className="break-all font-light text-foreground-dimmed text-xs">
                  <span className="font-medium text-foreground-dimmed">
                    {translate("services.schemaLabel")}
                  </span>{" "}
                  <span className="font-mono text-foreground">
                    {service.schema}
                  </span>
                </p>
              )}
            </div>

            <ValidationBadge
              label={
                service.recognized
                  ? translate("badge.recognized")
                  : translate("badge.custom")
              }
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
  const translate = useTranslations("ucpValidator.form");

  if (capabilities.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title={translate("capabilities.title")}
        description={translate("capabilities.description")}
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
                    label={translate("badge.version", {
                      value: capability.version ?? translate("badge.missing"),
                    })}
                    tone={capability.version ? "success" : "danger"}
                  />
                  {capability.spec && (
                    <ValidationBadge
                      label={translate("badge.specLinked")}
                      tone="success"
                    />
                  )}
                  {capability.schema && (
                    <ValidationBadge
                      label={translate("badge.schemaLinked")}
                      tone="success"
                    />
                  )}
                </div>
                {configKeys.length > 0 && (
                  <div className="font-light text-foreground-dimmed text-xs">
                    <span className="font-medium text-foreground-dimmed">
                      {translate("capabilities.configLabel")}
                    </span>{" "}
                    <span className="font-mono text-foreground">
                      {configKeys.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              <ValidationBadge
                label={
                  capability.recognized
                    ? translate("badge.known")
                    : translate("badge.custom")
                }
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
  const translate = useTranslations("ucpValidator.form");

  if (paymentHandlers.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title={translate("paymentHandlers.title")}
        description={translate("paymentHandlers.description")}
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
                label={translate("badge.version", {
                  value: handler.version ?? translate("badge.missing"),
                })}
                tone={handler.version ? "success" : "warning"}
              />
              {handler.id && (
                <ValidationBadge
                  label={translate("badge.id", { value: handler.id })}
                  tone="success"
                />
              )}
              <ValidationBadge
                label={
                  handler.recognized
                    ? translate("badge.known")
                    : translate("badge.custom")
                }
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
  judged,
  flagged,
}: {
  signingKeys: UcpCheck.ParsedSigningKey[];
  advertised: boolean;
  judged: boolean;
  /** Positions of the keys the validator reported an error on. */
  flagged: ReadonlySet<number>;
}) => {
  const translate = useTranslations("ucpValidator.form");

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title={translate("signingKeys.title")}
        description={translate("signingKeys.description")}
      />
      {!advertised ? (
        <div className="bg-background px-4 py-5">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-warning" />
            <ValidationBadge
              label={translate("badge.signingKeysNotAdvertised")}
              tone="warning"
            />
          </div>
          <p className="mt-3 max-w-2xl font-light text-foreground-dimmed text-sm">
            {translate("signingKeys.notAdvertisedBody")}
          </p>
        </div>
      ) : signingKeys.length === 0 ? (
        <div className="bg-background px-4 py-5">
          <ValidationBadge
            label={translate("badge.signingKeysEmpty")}
            tone="warning"
          />
        </div>
      ) : (
        <div className="divide-y divide-accent-foreground">
          {signingKeys.map((key, index) => {
            const hasIssue =
              flagged.has(index) ||
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
                      {key.kid ?? translate("badge.missingKid")}
                    </p>
                  </div>
                  <p className="mt-1 font-light text-foreground-dimmed text-xs">
                    {key.hasPrivateMaterial
                      ? translate("signingKeys.privateMaterial")
                      : translate("signingKeys.publicJwk")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ValidationBadge
                    label={translate("badge.kty", {
                      value: key.kty ?? translate("badge.missing"),
                    })}
                    tone={key.kty ? "success" : "danger"}
                  />
                  <ValidationBadge
                    label={translate("badge.use", {
                      value: key.use ?? translate("badge.missing"),
                    })}
                    tone={key.use === "sig" ? "success" : "warning"}
                  />
                  <ValidationBadge
                    label={translate("badge.alg", {
                      value: key.alg ?? translate("badge.missing"),
                    })}
                    tone={key.alg ? "success" : "warning"}
                  />
                  {key.kty === "EC" && (
                    <ValidationBadge
                      label={translate("badge.crv", {
                        value: key.crv ?? translate("badge.missing"),
                      })}
                      tone={key.crv ? "success" : "danger"}
                    />
                  )}
                </div>

                {judged && (
                  <ValidationBadge
                    label={
                      hasIssue
                        ? translate("badge.issues")
                        : translate("badge.valid")
                    }
                    tone={hasIssue ? "danger" : "success"}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SupportedVersionsSection = ({
  supportedVersions,
}: {
  supportedVersions: UcpCheck.ParsedSupportedVersion[];
}) => {
  const translate = useTranslations("ucpValidator.form");

  if (supportedVersions.length === 0) return null;

  return (
    <div className="border-accent-foreground border-t">
      <SectionHeading
        title={translate("supportedVersions.title")}
        description={translate("supportedVersions.description")}
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
                <ValidationBadge
                  label={translate("badge.current")}
                  tone="success"
                />
              )}
              <ValidationBadge
                label={
                  version.isHttps
                    ? translate("badge.https")
                    : translate("badge.insecure")
                }
                tone={version.isHttps ? "success" : "danger"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SpecIssuesSection = ({
  issues,
  judged,
}: {
  issues: UcpCheck.SpecIssue[];
  judged: boolean;
}) => {
  const translate = useTranslations("ucpValidator.form");
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
        title={translate("spec.title")}
        description={translate("spec.description", {
          errors: errorCount,
          warnings: warningCount,
        })}
      />

      {issues.length === 0 ? (
        <div className="bg-background px-4 py-5">
          <ValidationBadge
            label={
              judged
                ? translate("badge.noIssuesFound")
                : translate("badge.notValidated")
            }
            tone={judged ? "success" : "neutral"}
          />
          <p className="mt-3 max-w-2xl font-light text-foreground-dimmed text-sm">
            {judged
              ? translate("spec.noIssuesBody")
              : translate("spec.noProfileBody")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-accent-foreground">
          {grouped.map((group) => (
            <div key={group.category} className="bg-background">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="font-medium text-foreground text-sm">
                  {issueCategoryLabel(group.category, translate)} ·{" "}
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
                      label={
                        issue.severity === "error"
                          ? translate("badge.error")
                          : translate("badge.warning")
                      }
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
  const translate = useTranslations("ucpValidator.form");
  const errorCount = result.specIssues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const allowedBotCount = result.robots.filter((bot) => bot.allowed).length;
  const recognizedCapabilities = result.capabilities.filter(
    (capability) => capability.recognized,
  ).length;
  // The profile was read against a revision this validator implements. When
  // it was not, zero spec errors means nothing was checked — not a pass.
  const judged = result.validatedAgainst !== null;
  const unchecked = !judged && errorCount === 0;
  const unvalidated = result.found && unchecked;
  const flaggedKeys = new Set(
    result.specIssues.flatMap((issue) => {
      if (issue.category !== "signing_keys") return [];
      if (issue.severity !== "error") return [];
      const position = issue.field.match(/\[(\d+)\]/)?.[1];
      return position === undefined ? [] : [Number(position)];
    }),
  );
  const overallPass =
    result.https &&
    result.found &&
    result.valid &&
    judged &&
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
                tone={(() => {
                  switch (true) {
                    case unvalidated:
                      return "neutral";
                    case result.isLatestVersion:
                      return "success";
                    default:
                      return "warning";
                  }
                })()}
                className="font-mono normal-case tracking-normal"
              >
                v{result.ucpVersion}
                {(() => {
                  switch (true) {
                    case unvalidated:
                      return translate("badge.notValidatedSuffix");
                    case result.isLatestVersion:
                      return null;
                    default:
                      return translate("badge.latestSuffix", {
                        version: LATEST_UCP_VERSION,
                      });
                  }
                })()}
              </StatusPill>
            )}
            {result.envelopeKind && (
              <StatusPill
                tone="neutral"
                className="font-mono normal-case tracking-normal"
              >
                {translate("badge.envelope", {
                  kind:
                    result.envelopeKind === "wrapped"
                      ? "ucp{}"
                      : translate("badge.envelopeFlatKind"),
                })}
              </StatusPill>
            )}
            <ValidationBadge
              label={(() => {
                switch (true) {
                  case overallPass:
                    return translate("badge.ucpReady");
                  case unvalidated:
                    return translate("badge.notValidated");
                  default:
                    return translate("badge.needsFixes");
                }
              })()}
              tone={(() => {
                switch (true) {
                  case overallPass:
                    return "success";
                  case unvalidated:
                    return "warning";
                  default:
                    return "danger";
                }
              })()}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-medium text-primary-text text-sm">
              {translate("results.responseHealth")}
            </p>
            <p className="mt-1 font-light text-foreground-dimmed text-sm leading-relaxed">
              {result.error ?? translate("results.responseHealthOk")}
            </p>
          </div>

          <div>
            <p className="font-medium text-primary-text text-sm">
              {translate("results.detectedSurface")}
            </p>
            <p className="mt-1 font-light text-foreground-dimmed text-sm leading-relaxed">
              {translate("results.detectedSurfaceValue", {
                services: result.services.length,
                capabilities: result.capabilities.length,
                handlers: result.paymentHandlers.length,
                keys: result.signingKeys.length,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-accent-foreground lg:grid-cols-4">
        <SummaryCard
          label={translate("summary.latency.label")}
          value={formatLatency(result.latencyMs, translate)}
          detail={
            result.latencyMs === null
              ? translate("summary.latency.unavailableDetail")
              : translate("summary.latency.detail")
          }
          tone={result.latencyMs === null ? "danger" : "success"}
        />

        <SummaryCard
          label={translate("summary.specErrors.label")}
          value={unchecked ? "—" : String(errorCount)}
          detail={(() => {
            switch (true) {
              case unvalidated:
                return translate("summary.specErrors.notValidatedDetail");
              case unchecked:
                return translate("summary.specErrors.noProfileDetail");
              case errorCount === 0:
                return translate("summary.specErrors.noneDetail");
              default:
                return translate("summary.specErrors.someDetail");
            }
          })()}
          tone={(() => {
            switch (true) {
              case unchecked:
                return "neutral";
              case errorCount > 0:
                return "danger";
              default:
                return "success";
            }
          })()}
        />

        <SummaryCard
          label={translate("summary.capabilities.label")}
          value={`${recognizedCapabilities}/${result.capabilities.length || 0}`}
          detail={
            result.capabilities.length === 0
              ? translate("summary.capabilities.noneDetail")
              : translate("summary.capabilities.someDetail")
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
          label={translate("summary.botAccess.label")}
          value={`${allowedBotCount}/${result.robots.length}`}
          detail={translate("summary.botAccess.detail")}
          tone={
            allowedBotCount === result.robots.length ? "success" : "warning"
          }
        />
      </div>

      <div className="border-accent-foreground border-t">
        <SectionHeading
          title={translate("coreChecks.title")}
          description={translate("coreChecks.description")}
        />

        <div className="divide-y divide-accent-foreground">
          <CheckRow
            label={translate("coreChecks.https.label")}
            passed={result.https}
            detail={translate("coreChecks.https.detail")}
          />
          <CheckRow
            label={translate("coreChecks.wellKnown.label")}
            passed={result.found}
            detail={
              result.found
                ? result.httpStatus !== null
                  ? result.valid
                    ? translate("coreChecks.wellKnown.httpStatus", {
                        status: String(result.httpStatus),
                      })
                    : translate("coreChecks.wellKnown.httpStatusNotJson", {
                        status: String(result.httpStatus),
                      })
                  : translate("coreChecks.wellKnown.responded")
                : (result.error ?? translate("coreChecks.wellKnown.noResponse"))
            }
          />
          <CheckRow
            label={translate("coreChecks.validJson.label")}
            passed={result.valid}
            detail={
              result.valid
                ? result.httpStatus !== null
                  ? translate("coreChecks.validJson.contentTypeWithStatus", {
                      contentType: result.contentType ?? "—",
                      status: String(result.httpStatus),
                    })
                  : translate("coreChecks.validJson.contentType", {
                      contentType: result.contentType ?? "—",
                    })
                : (result.error ?? translate("coreChecks.validJson.invalid"))
            }
          />
          <CheckRow
            label={translate("coreChecks.latency.label")}
            passed={result.latencyMs !== null}
            detail={
              result.latencyMs === null
                ? translate("coreChecks.latency.unmeasured")
                : translate("coreChecks.latency.responded", {
                    latency: formatLatency(result.latencyMs, translate),
                  })
            }
          />
          <CheckRow
            label={translate("coreChecks.version.label")}
            passed={result.isLatestVersion}
            skipped={unvalidated}
            detail={(() => {
              switch (true) {
                case !result.ucpVersion:
                  return translate("coreChecks.version.none");
                case unvalidated:
                  return translate("coreChecks.version.notValidated", {
                    version: result.ucpVersion ?? "",
                    revisions: UCP_REVISIONS.join(", "),
                  });
                case result.isLatestVersion:
                  return translate("coreChecks.version.latest", {
                    version: result.ucpVersion ?? "",
                  });
                default:
                  return translate("coreChecks.version.outdated", {
                    version: result.ucpVersion ?? "",
                    latest: LATEST_UCP_VERSION,
                  });
              }
            })()}
          />
          <CheckRow
            label={translate("coreChecks.signingKeys.label")}
            passed={
              result.signingKeysAdvertised && result.signingKeys.length > 0
            }
            detail={
              result.signingKeysAdvertised
                ? translate("coreChecks.signingKeys.published", {
                    count: result.signingKeys.length,
                  })
                : translate("coreChecks.signingKeys.none")
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
        judged={judged}
        flagged={flaggedKeys}
      />
      <SupportedVersionsSection supportedVersions={result.supportedVersions} />

      <div className="border-accent-foreground border-t">
        <SectionHeading
          title={translate("robots.title")}
          description={translate("robots.description")}
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
                label={
                  bot.allowed
                    ? translate("badge.allowed")
                    : translate("badge.blocked")
                }
                tone={bot.allowed ? "success" : "danger"}
              />
            </div>
          ))}
        </div>
      </div>

      <SpecIssuesSection issues={result.specIssues} judged={judged} />

      {result.valid && result.data !== null && (
        <div className="border-accent-foreground border-t">
          <SectionHeading
            title={translate("response.title")}
            description={translate("response.description")}
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
  const translate = useTranslations("ucpValidator.form");
  const toast = useToastManager();
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<UcpCheck.UcpCheckResult | null>(null);
  const [run, setRun] = useState(0);

  const [handleCheck, isChecking] = useAsyncAction(async () => {
    const response = await UcpCheck.checkUCP(domain);

    if (!response.success) {
      toast.add({
        title: translate("toast.failedTitle"),
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
              <p className="font-medium text-primary-text text-sm">
                {translate("panel.checkADomain")}
              </p>
              <label
                htmlFor="ucp-domain"
                className="mt-3 block font-medium text-foreground text-sm"
              >
                {translate("panel.storefrontDomain")}
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <TextField
                  value={domain}
                  onValueChange={setDomain}
                  className="flex-1"
                >
                  <TextFieldInput
                    id="ucp-domain"
                    placeholder={translate("panel.placeholder")}
                  />
                </TextField>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isChecking || !domain.trim()}
                  className={submitButtonClassName}
                >
                  {isChecking
                    ? translate("action.checking")
                    : translate("action.primary")}
                </Button>
              </div>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                {translate.rich("panel.rootDomainNote", {
                  code: (chunks) => (
                    <span className="font-mono text-foreground">{chunks}</span>
                  ),
                })}
              </p>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="font-medium text-primary-text text-sm">
              {translate("intro.eyebrow")}
            </p>
            <h2 className="mt-2 font-body font-medium text-3xl text-foreground md:text-4xl">
              {translate("intro.title")}
            </h2>
            <p className="mt-3 font-light text-foreground-dimmed text-lg leading-relaxed">
              {translate.rich("intro.description", {
                version: LATEST_UCP_VERSION,
                code: (chunks) => (
                  <span className="font-mono text-foreground text-sm">
                    {chunks}
                  </span>
                ),
              })}
            </p>
          </div>

          <div className="flex flex-col justify-center border-accent-foreground border-t px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="ucp-domain"
                className="block font-medium text-foreground text-sm"
              >
                {translate("panel.domain")}
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <TextField
                  value={domain}
                  onValueChange={setDomain}
                  className="flex-1"
                >
                  <TextFieldInput
                    id="ucp-domain"
                    placeholder={translate("panel.placeholder")}
                  />
                </TextField>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isChecking || !domain.trim()}
                  className={submitButtonClassName}
                >
                  {isChecking
                    ? translate("action.checking")
                    : translate("action.primary")}
                </Button>
              </div>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                {translate.rich("panel.rootDomainNote", {
                  code: (chunks) => (
                    <span className="font-mono text-foreground">{chunks}</span>
                  ),
                })}
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
