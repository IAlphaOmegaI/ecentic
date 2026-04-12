"use client";

import { CheckCircleIcon, XCircleIcon } from "@zenncore/icons";
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

type PaymentHandlerEntry = {
  registryKey: string;
  label: string;
  id: string | null;
  version: string | null;
};

type UcpRoot = {
  ucp?: unknown;
  payment_handlers?: unknown;
};

type PaymentHandlerObject = {
  id?: unknown;
  version?: unknown;
};

const notes = [
  {
    title: "Use the public storefront domain",
    detail:
      "Enter the root domain only, like acme.com or www.acme.com. We always validate the HTTPS version.",
  },
  {
    title: "We check the live well-known route",
    detail:
      "Every run targets /.well-known/ucp, measures latency, and inspects the exact JSON returned by the server.",
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

const PAYMENT_HANDLER_LABELS: Record<string, string> = {
  "com.google.pay": "Google Pay",
  "dev.shopify.card": "Shopify Card",
  "dev.shopify.shop_pay": "Shop Pay",
  "com.apple.pay": "Apple Pay",
  "com.paypal": "PayPal",
  "com.stripe": "Stripe",
  "com.braintree": "Braintree",
  "com.klarna": "Klarna",
  "com.afterpay": "Afterpay",
  "com.affirm": "Affirm",
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

const extractPaymentHandlers = (data: unknown): PaymentHandlerEntry[] => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];

  const object = data as UcpRoot;
  const rawRoot = object.ucp;
  const root =
    rawRoot && typeof rawRoot === "object" && !Array.isArray(rawRoot)
      ? (rawRoot as UcpRoot)
      : object;

  const handlers = root.payment_handlers;
  if (!handlers || typeof handlers !== "object" || Array.isArray(handlers))
    return [];

  const entries: PaymentHandlerEntry[] = [];

  for (const [key, items] of Object.entries(
    handlers as Record<string, unknown>,
  )) {
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;

      const entry = item as PaymentHandlerObject;
      entries.push({
        registryKey: key,
        label: PAYMENT_HANDLER_LABELS[key] ?? key,
        id: typeof entry.id === "string" ? entry.id : null,
        version: typeof entry.version === "string" ? entry.version : null,
      });
    }
  }

  return entries;
};

const extractUcpVersion = (data: unknown): string | null => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  const rawRoot = obj["ucp"];
  const root =
    rawRoot && typeof rawRoot === "object" && !Array.isArray(rawRoot)
      ? (rawRoot as Record<string, unknown>)
      : obj;
  return typeof root["version"] === "string" ? root["version"] : null;
};

const Results = ({ result }: { result: UcpCheck.UcpCheckResult }) => {
  const paymentHandlers = extractPaymentHandlers(result.data);
  const ucpVersion = extractUcpVersion(result.data);
  const errorCount = result.specIssues.filter(
    (issue: UcpCheck.SpecIssue) => issue.severity === "error",
  ).length;
  const warningCount = result.specIssues.filter(
    (issue: UcpCheck.SpecIssue) => issue.severity === "warning",
  ).length;
  const allowedBotCount = result.robots.filter((bot) => bot.allowed).length;
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

            <div className="flex shrink-0 items-center gap-2">
              {ucpVersion && (
                <span className="inline-flex items-center bg-accent-foreground px-2 py-1 font-mono text-foreground-dimmed text-xs">
                  v{ucpVersion}
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
                Payment handlers
              </p>
              <p className="mt-1 font-light text-foreground-dimmed text-sm">
                {paymentHandlers.length === 0
                  ? "No payment handlers were detected in the current response."
                  : `${paymentHandlers.length} handler${paymentHandlers.length !== 1 ? "s" : ""} detected in the profile.`}
              </p>
            </div>
          </div>
        </div>

        <SummaryCard
          label="Latency"
          value={formatLatency(result.latencyMs)}
          detail={
            result.latencyMs === null
              ? "We could not measure a live response time. "
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
          label="Warnings"
          value={String(warningCount)}
          detail={
            warningCount === 0
              ? "No advisory warnings were raised."
              : "Advisory issues that may affect compatibility."
          }
          tone={warningCount > 0 ? "warning" : "success"}
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
        </div>
      </div>

      {paymentHandlers.length > 0 && (
        <div className="border-accent-foreground border-t">
          <SectionHeading
            title="Payment handlers"
            description="Detected from the profile payload so you can quickly sanity-check surfaced checkout integrations."
          />

          <div className="grid gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-3">
            {paymentHandlers.map((handler) => (
              <div
                key={`${handler.registryKey}-${handler.id ?? handler.version ?? handler.label}`}
                className="bg-background px-4 py-4"
              >
                <p className="font-medium text-foreground text-sm">
                  {handler.label}
                </p>
                <p className="mt-1 font-mono text-foreground-dimmed text-xs">
                  {handler.registryKey}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusChip
                    label={`ID ${handler.id ?? "Missing"}`}
                    tone={handler.id ? "success" : "warning"}
                  />
                  <StatusChip
                    label={`Version ${handler.version ?? "Missing"}`}
                    tone={handler.version ? "success" : "warning"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="border-accent-foreground border-t">
        <SectionHeading
          title="Spec validation"
          description={`${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warningCount} warning${warningCount !== 1 ? "s" : ""}`}
        />

        {result.specIssues.length === 0 ? (
          <div className="bg-background px-4 py-5">
            <StatusChip label="No issues found" tone="success" />
            <p className="mt-3 max-w-2xl font-light text-foreground-dimmed text-sm">
              The current profile passed the validator without schema errors or
              warnings.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-accent-foreground">
            {result.specIssues.map((issue: UcpCheck.SpecIssue) => (
              <div
                key={`${issue.severity}-${issue.field}-${issue.message}`}
                className="grid gap-4 bg-background px-4 py-4 md:grid-cols-[auto_minmax(0,220px)_minmax(0,1fr)] md:items-start"
              >
                <StatusChip
                  label={issue.severity === "error" ? "Error" : "Warning"}
                  tone={issue.severity === "error" ? "danger" : "warning"}
                />
                <p className="font-mono text-foreground-dimmed text-xs">
                  {issue.field}
                </p>
                <p className="text-foreground text-sm">{issue.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {paymentHandlers.length > 0 && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b px-5 py-2.5">
            <p className="font-medium text-foreground text-sm">
              Payment Methods
            </p>
            <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
              {paymentHandlers.length} handler
              {paymentHandlers.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <div className="divide-y divide-accent-foreground">
            {paymentHandlers.map((handler, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list
              <div key={index} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">
                    {handler.label}
                  </p>
                  <p className="mt-0.5 font-mono text-foreground-dimmed text-xs">
                    {handler.registryKey}
                    {handler.id ? ` · id: ${handler.id}` : ""}
                  </p>
                </div>
                {handler.version && (
                  <span className="inline-flex items-center bg-accent-foreground/30 px-2 py-0.5 font-mono text-foreground-dimmed text-xs">
                    {handler.version}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
      <div className="grid gap-px bg-accent-foreground lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="bg-background px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="font-medium text-2xl text-foreground sm:text-3xl">
            Run a live validation
          </h2>
          <p className="mt-2 max-w-2xl font-light text-foreground-dimmed text-sm sm:text-base">
            Paste a domain and we&apos;ll fetch the live{" "}
            <span className="font-mono text-foreground">/.well-known/ucp</span>{" "}
            document, evaluate the response, and lay out the issues in the same
            structured style used across onboarding and dashboard surfaces.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-px bg-accent-foreground"
          >
            <div className="bg-background-dimmed p-4">
              <label
                htmlFor="ucp-domain"
                className="block font-medium text-foreground text-xs uppercase tracking-[0.18em]"
              >
                Domain
              </label>
              <TextField
                value={domain}
                onValueChange={setDomain}
                className="mt-2 h-9 border border-accent-foreground bg-background"
              >
                <TextFieldInput
                  id="ucp-domain"
                  placeholder="yourdomain.com"
                  className="px-3 text-sm"
                />
              </TextField>
              <p className="mt-2 font-light text-foreground-dimmed text-xs">
                Use the storefront domain only, like{" "}
                <span className="font-mono text-foreground">acme.com</span> or{" "}
                <span className="font-mono text-foreground">www.acme.com</span>.
              </p>
            </div>

            <div className="bg-background p-4">
              <Button
                type="submit"
                variant="flat"
                color="primary"
                disabled={isChecking || !domain.trim()}
                className="w-full justify-center py-2 text-sm"
              >
                {isChecking ? "Checking..." : "Check domain"}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-background-dimmed px-6 py-6 sm:px-8 sm:py-8">
          <p className="font-medium text-foreground text-sm">
            Before you run it
          </p>
          <div className="mt-4 space-y-4">
            {notes.map((note) => (
              <div
                key={note.title}
                className="border-accent-foreground border-t pt-4 first:border-t-0 first:pt-0"
              >
                <p className="font-medium text-foreground text-sm">
                  {note.title}
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm">
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
