import { connection } from "next/server";
import { Suspense } from "react";
import { DiscoveryClient } from "@/components/discovery/discovery-client";
import { seo } from "@/lib/seo";
import { accessCode } from "@/server/app/intelligence/discovery-report";
import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../dashboard/_components/grid";

// The code is an environment read, so it streams in rather than being frozen
// into the prerendered shell — swapping DEV_DISCOVERY_TOKEN must not require a
// rebuild for this page to stop showing the old one.
const AccessCode = async () => {
  await connection();

  const code = accessCode();

  if (code === null)
    return (
      <p className="text-foreground-dimmed text-sm">
        No access code is configured. Set{" "}
        <span className="font-mono">DEV_DISCOVERY_TOKEN</span> — deployed
        environments have no fallback, so the endpoint answers 503 until they
        do.
      </p>
    );

  const parameters = new URLSearchParams({ code, store: "allbirds.com" });
  parameters.append("q", "best wool sneakers");
  parameters.append("q", "comfortable everyday shoes");

  return (
    <>
      <pre className="overflow-x-auto rounded-lg border border-accent-foreground bg-background-dimmed p-3 font-mono text-foreground text-xs">
        {`${seo.host}/api/dev/discovery?${parameters}`}
      </pre>
      <p className="text-foreground-dimmed text-xs">
        Access code: <span className="font-mono text-foreground">{code}</span> —
        static for now, set with{" "}
        <span className="font-mono">DEV_DISCOVERY_TOKEN</span>.
      </p>
    </>
  );
};

const AccessCodeSkeleton = () => (
  <>
    <div className="h-11 animate-pulse rounded-lg border border-accent-foreground bg-background-dimmed" />
    <div className="h-4 w-64 animate-pulse rounded bg-background-dimmed" />
  </>
);

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">
              AI Visibility — Store discovery
            </StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              AI Discovery
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              See which stores AI shopping agents recommend for a query — and
              exactly why your store did or didn’t make the cut, and how it
              ranked.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <DiscoveryClient />
        </div>
      </div>

      {/* Headless endpoint — the same run as Markdown, for AI platforms */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 space-y-3 px-6 py-8">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <SectionKicker>Headless endpoint</SectionKicker>
          <p className="text-foreground-dimmed text-sm">
            The same run as a Markdown report, for an AI chat that can fetch a
            URL. Pass the access code as{" "}
            <span className="font-mono text-xs">Authorization: Bearer</span>,{" "}
            <span className="font-mono text-xs">x-discovery-code</span>, or a{" "}
            <span className="font-mono text-xs">code</span> query parameter —
            headers keep it out of chat transcripts and fetch logs. Repeat{" "}
            <span className="font-mono text-xs">q</span> for up to eight
            shopping queries; add{" "}
            <span className="font-mono text-xs">format=json</span> for the raw
            run.
          </p>
          <Suspense fallback={<AccessCodeSkeleton />}>
            <AccessCode />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);
