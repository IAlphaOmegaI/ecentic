"use client";

import { CheckCircleIcon, XCircleIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { type SubmitEvent, useState } from "react";
import type {
  SpecIssue,
  UcpCheckResult,
} from "@/server/app/intelligence/ucp-check";
import { checkUCP } from "@/server/app/intelligence/ucp-check";

type CheckRowProps = {
  label: string;
  passed: boolean;
  detail?: string | null;
};

const CheckRow = ({ label, passed, detail }: CheckRowProps) => (
  <div className="flex items-start gap-3 py-3">
    <span className={cn(passed ? "text-primary" : "text-red-500")}>
      {passed ? <CheckCircleIcon /> : <XCircleIcon />}
    </span>
    <div className="flex-1">
      <p className="font-medium text-foreground text-sm">{label}</p>
      {detail && (
        <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
          {detail}
        </p>
      )}
    </div>
    <span
      className={cn(
        "mt-0.5 inline-flex items-center px-2 py-0.5 font-medium text-xs",
        passed ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500",
      )}
    >
      {passed ? "Pass" : "Fail"}
    </span>
  </div>
);

type JToken = {
  text: string;
  type: "key" | "string" | "number" | "boolean" | "null" | "punct" | "space";
};

const tokenizeJson = (json: string): JToken[] => {
  const tokens: JToken[] = [];
  let index = 0;

  while (index < json.length) {
    if (json[index] === undefined) continue;

    if (/\s/.test(json[index])) {
      let text = "";
      while (index < json.length && /\s/.test(json[index]))
        text += json[index++];
      tokens.push({ text, type: "space" });
      continue;
    }
    if (json[index] === '"') {
      let text = '"';

      index++;
      while (index < json.length && json[index] !== '"') {
        if (json[index] === "\\") text += json[index++];
        text += json[index++];
      }

      text += '"';
      index++;
      let j = index;

      while (j < json.length && /\s/.test(json[j])) j++;

      tokens.push({ text, type: json[j] === ":" ? "key" : "string" });
      continue;
    }

    if (/[-\d]/.test(json[index])) {
      let text = "";
      while (index < json.length && /[-\d.eE+]/.test(json[index]))
        text += json[index++];
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

    tokens.push({ text: json[index], type: "punct" });
    index++;
  }
  return tokens;
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

const JsonPreview = ({ data }: { data: unknown }) => {
  const json = JSON.stringify(data, null, 2);
  return (
    <pre className="max-h-80 overflow-auto rounded-none p-4 font-mono text-xs leading-relaxed">
      <code>
        {tokenizeJson(json).map((token, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable
          <span key={index} className={tokenColor[token.type]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
};

const Results = ({ result }: { result: UcpCheckResult }) => {
  const overallPass = result.https && result.found && result.valid;
  return (
    <div className="mt-6 border border-accent-foreground bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-accent-foreground border-b px-5 py-3">
        <div>
          <p className="font-medium text-foreground text-sm">{result.domain}</p>
          <p className="mt-0.5 font-mono text-foreground-dimmed text-xs">
            {result.url}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-sm",
            overallPass
              ? "bg-primary/10 text-primary"
              : "bg-red-500/10 text-red-500",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              overallPass ? "bg-primary" : "bg-red-500",
            )}
          />
          {overallPass ? "UCP Ready" : "Not UCP Ready"}
        </span>
      </div>

      <div className="divide-y divide-accent-foreground px-5">
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
      </div>

      {result.specIssues.length > 0 && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b px-5 py-2.5">
            <p className="font-medium text-foreground text-sm">
              Spec Validation
            </p>
            <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
              {
                result.specIssues.filter(
                  (i: SpecIssue) => i.severity === "error",
                ).length
              }{" "}
              error
              {result.specIssues.filter(
                (i: SpecIssue) => i.severity === "error",
              ).length !== 1
                ? "s"
                : ""}
              ,{" "}
              {
                result.specIssues.filter(
                  (i: SpecIssue) => i.severity === "warning",
                ).length
              }{" "}
              warning
              {result.specIssues.filter(
                (i: SpecIssue) => i.severity === "warning",
              ).length !== 1
                ? "s"
                : ""}
            </p>
          </div>
          <div className="divide-y divide-accent-foreground">
            {result.specIssues.map((issue: SpecIssue, index: number) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list
              <div key={index} className="flex items-start gap-3 px-5 py-2.5">
                <span
                  className={cn(
                    "mt-0.5 inline-flex shrink-0 items-center px-1.5 py-0.5 font-medium text-xs",
                    issue.severity === "error"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-yellow-500/10 text-yellow-500",
                  )}
                >
                  {issue.severity === "error" ? "Error" : "Warn"}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-foreground-dimmed text-xs">
                    {issue.field}
                  </p>
                  <p className="mt-0.5 text-foreground text-xs">
                    {issue.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.valid && result.data !== null && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b px-5 py-2.5">
            <p className="font-medium text-foreground text-sm">UCP Response</p>
          </div>
          <JsonPreview data={result.data} />
        </div>
      )}
    </div>
  );
};

export const UcpValidatorForm = () => {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<UcpCheckResult | null>(null);

  const [handleCheck, isChecking] = useAsyncAction(async () => {
    const response = await checkUCP(domain);
    if (response.success) setResult(response.data);
  });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCheck();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <TextField
          value={domain}
          onValueChange={setDomain}
          className="h-10 flex-1 border border-accent-foreground bg-background"
        >
          <TextFieldInput
            placeholder="yourdomain.com"
            className="px-3 text-sm"
          />
        </TextField>
        <Button
          type="submit"
          variant="flat"
          color="primary"
          disabled={isChecking || !domain.trim()}
          className="h-10 px-5 text-sm"
        >
          {isChecking ? "Checking..." : "Check"}
        </Button>
      </form>

      {result && <Results result={result} />}
    </div>
  );
};
