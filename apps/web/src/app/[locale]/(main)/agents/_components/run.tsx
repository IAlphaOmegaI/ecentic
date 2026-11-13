"use client";

import { ArrowRightIcon, DownloadIcon, LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { useLocale } from "next-intl";
import { type ComponentProps, type ReactNode, useState } from "react";
import { StatusPill } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { Link } from "@/i18n/navigation";
import * as Entry from "@/server/app/entry";
import type * as Catalog from "@/server/app/storefront/catalog";
import {
  channelLine,
  count,
  offerLabels,
  offerTitle,
  type Snapshot,
  settled,
  stageLabels,
  uploadLine,
  usePoll,
} from "./live";
import { RunSkeleton } from "./skeletons";

const once = () => true;

/** Store data is the store's say-so: only web URLs reach an `href` or `src`. */
const isWeb = (url: string | null): url is string =>
  url !== null && /^https?:\/\//i.test(url);

const kinds = {
  inferred: { label: "Inferred", tone: "warning" },
  rewritten: { label: "Rewritten", tone: "primary" },
  cleaned: { label: "Cleaned", tone: "neutral" },
} as const;

const offerTones = {
  pending: "neutral",
  accepted: "primary",
  merged: "success",
  rejected: "error",
  skipped: "neutral",
} as const;

const channels = { google: "Google & Gemini", chatgpt: "ChatGPT" } as const;

const Heading = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="border-accent-foreground border-b bg-background-dimmed px-6 py-4 sm:px-8">
    <h2 className="font-medium text-foreground text-lg">{title}</h2>
    {description && (
      <p className="mt-1 font-light text-foreground-dimmed text-sm">
        {description}
      </p>
    )}
  </div>
);

const Pill = ({
  tone,
  children,
}: {
  tone: ComponentProps<typeof StatusPill>["tone"];
  children: ReactNode;
}) => (
  <StatusPill tone={tone} className="normal-case tracking-normal">
    {children}
  </StatusPill>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col gap-2 bg-background-dimmed px-6 py-6 sm:px-8">
    <p className="font-medium text-primary-text text-sm">{label}</p>
    <p className="font-medium text-4xl text-foreground-rich tabular-nums">
      {value}
    </p>
  </div>
);

const Notice = ({
  title,
  description,
  retry = true,
}: {
  title: string;
  description: string;
  retry?: boolean;
}) => (
  <div className="flex flex-col items-start gap-4 bg-background px-6 py-10 sm:px-8">
    <div>
      <p className="font-medium text-2xl text-foreground">{title}</p>
      <p className="mt-2 max-w-2xl font-light text-foreground-dimmed">
        {description}
      </p>
    </div>
    {retry && (
      <Button color="accent" render={<Link href="/agents" />}>
        Try another store
        <ArrowRightIcon className="size-4" />
      </Button>
    )}
  </div>
);

const Channel = ({
  label,
  channel,
  format,
  href,
  children,
}: {
  label: string;
  channel: Catalog.Summary["google"];
  format: string;
  href: string;
  children?: ReactNode;
}) => (
  <div className="flex flex-col items-start gap-4 bg-background-rich px-6 py-6 sm:px-8">
    <p className="font-medium text-2xl text-foreground leading-snug">
      {channelLine(label, channel)}
    </p>
    {channel.ready > 0 ? (
      <Button color="primary" render={<a href={href} download />}>
        <DownloadIcon className="size-4" />
        Download the {format}
      </Button>
    ) : (
      <Button color="primary" disabled>
        <DownloadIcon className="size-4" />
        Nothing to download yet
      </Button>
    )}
    {children}
  </div>
);

const Connect = ({ origin }: { origin: string }) => {
  const locale = useLocale();
  const [problem, setProblem] = useState<string | null>(null);

  const [handleConnect, isPending] = useAsyncAction(async () => {
    setProblem(null);

    // A resolved store redirects from the action and never returns here.
    const call = await resultify(() => Entry.begin({ url: origin, locale }));
    if (!call.success || !call.data?.success) {
      setProblem("That didn't go through. Try again.");
      return;
    }

    switch (call.data.data.kind) {
      case "limited":
        setProblem("Too many tries in a row. Give it a minute.");
        return;
      case "unreachable":
        setProblem(`We couldn't reach ${call.data.data.host} just now.`);
        return;
      default:
        setProblem("We couldn't read that store's address.");
    }
  });

  return (
    <div className="flex flex-col items-start gap-3 bg-background-rich px-6 py-6 sm:px-8">
      <p className="max-w-2xl text-foreground">
        We only publish to Merchant Center accounts that own the store's
        website.
      </p>
      <Button
        color="primary"
        disabled={isPending}
        onClick={() => void handleConnect()}
      >
        Connect your Merchant Center
        {isPending ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <ArrowRightIcon className="size-4" />
        )}
      </Button>
      {problem && (
        <p role="status" className="text-error text-sm">
          {problem}
        </p>
      )}
    </div>
  );
};

const Offer = ({ line }: { line: Catalog.OfferLine }) => (
  <div className="flex flex-col gap-2 bg-background-rich px-6 py-4 sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 font-medium text-foreground">{offerTitle(line)}</p>
      <Pill tone={offerTones[line.status]}>{offerLabels[line.status]}</Pill>
    </div>
    {line.destinations.length > 0 && (
      <p className="font-light text-foreground-dimmed text-sm">
        {line.destinations.join(", ")}
      </p>
    )}
    {line.response && (
      <p className="break-all font-mono text-foreground-dimmed text-xs">
        {line.response}
      </p>
    )}
    {line.issues.map((issue) => (
      <p key={issue} className="text-error text-sm">
        {issue}
      </p>
    ))}
  </div>
);

const Merchant = ({ summary }: { summary: Catalog.Summary }) => (
  <section className="border-accent-foreground border-t">
    <Heading
      title="Google Merchant Center"
      description={
        summary.merchant?.eligible && summary.merchant.account
          ? `Account ${summary.merchant.account}`
          : undefined
      }
    />
    {summary.merchant?.eligible ? (
      <div className="flex flex-col gap-px bg-accent-foreground">
        {summary.merchant.lines.map((line) => (
          <Offer key={line.offerId} line={line} />
        ))}
      </div>
    ) : (
      <Connect origin={summary.origin} />
    )}
  </section>
);

const Thumbnail = ({ product }: { product: Catalog.Product }) => {
  const [broken, setBroken] = useState(false);
  const source = [
    ...product.images,
    ...product.variants.map((variant) => variant.image),
  ].find(isWeb);

  if (!source || broken)
    return (
      <span className="block size-10 shrink-0 rounded-md bg-background-dimmed" />
    );

  return (
    // Store images come from arbitrary hosts, so next/image is out.
    // biome-ignore lint/performance/noImgElement: arbitrary remote hosts
    <img
      src={source}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="size-10 shrink-0 rounded-md bg-background-dimmed object-cover"
    />
  );
};

const Value = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex min-w-0 flex-col gap-1 bg-background-rich px-3 py-2">
    <p className="font-medium text-foreground-dimmed text-xs">{label}</p>
    <p className="line-clamp-6 whitespace-pre-line break-words text-foreground text-sm">
      {value ?? "Not stated by the store"}
    </p>
  </div>
);

const FixRow = ({ fix }: { fix: Catalog.Fix }) => (
  <div className="flex flex-col gap-2 py-3">
    <div className="flex flex-wrap items-center gap-2">
      <Pill tone={kinds[fix.kind].tone}>{kinds[fix.kind].label}</Pill>
      <span className="font-mono text-foreground-dimmed text-xs">
        {fix.field}
      </span>
    </div>
    <p className="font-light text-foreground-dimmed text-sm">{fix.reason}</p>
    <div className="grid gap-px border border-accent-foreground bg-accent-foreground sm:grid-cols-2">
      <Value label="Before" value={fix.before} />
      <Value label="After" value={fix.after} />
    </div>
  </div>
);

const FindingRow = ({ finding }: { finding: Catalog.Finding }) => (
  <div className="flex flex-col gap-1 py-3">
    <div className="flex flex-wrap items-center gap-2">
      <Pill tone={finding.severity === "error" ? "error" : "warning"}>
        {finding.severity === "error"
          ? "Keeps it out of the feed"
          : "Ships with a warning"}
      </Pill>
      <span className="text-foreground-dimmed text-xs">
        {channels[finding.channel]}
      </span>
      <span className="font-mono text-foreground-dimmed text-xs">
        {finding.field}
      </span>
    </div>
    <p className="text-foreground text-sm">{finding.message}</p>
  </div>
);

const PolicyLine = ({ prepared }: { prepared: Catalog.Prepared }) => {
  if (prepared.policy)
    return (
      <div className="flex flex-col gap-1 py-3">
        <p className="font-medium text-error text-sm">
          Flagged under OpenAI's prohibited products policy:{" "}
          {prepared.policy.category}
        </p>
        <p className="font-light text-foreground-dimmed text-sm">
          {prepared.policy.reason}
        </p>
      </div>
    );

  if (!prepared.policyChecked)
    return (
      <p className="py-3 font-light text-foreground-dimmed text-sm">
        OpenAI's prohibited products policy check did not run for this product,
        so it has not been cleared.
      </p>
    );

  return null;
};

const ProductItem = ({ prepared }: { prepared: Catalog.Prepared }) => {
  const { product, fixes, findings, ready } = prepared;
  const url = isWeb(product.url) ? product.url : null;

  return (
    <AccordionItem className="border-accent-foreground bg-background-rich">
      <AccordionTrigger
        className="items-center gap-3 px-6 py-3 sm:px-8"
        classList={{ trigger: { icon: "mr-0 shrink-0" } }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Thumbnail product={product} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-foreground text-sm">
              {product.title}
            </span>
            <span className="font-light text-foreground-dimmed text-xs">
              {count(fixes.length, "fix", "fixes")},{" "}
              {count(findings.length, "issue", "issues")}
            </span>
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 sm:flex">
          <Pill tone={ready.google ? "success" : "warning"}>
            {ready.google ? "Ready for Google" : "Not ready for Google"}
          </Pill>
          <Pill tone={ready.chatgpt ? "success" : "warning"}>
            {ready.chatgpt
              ? prepared.policyChecked
                ? "Ready for ChatGPT"
                : "Ready for ChatGPT, policy not checked"
              : "Not ready for ChatGPT"}
          </Pill>
        </span>
      </AccordionTrigger>
      <AccordionPanel>
        <div className="flex flex-col divide-y divide-accent-foreground border-accent-foreground border-t bg-background px-6 pb-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 py-3 sm:hidden">
            <Pill tone={ready.google ? "success" : "warning"}>
              {ready.google ? "Ready for Google" : "Not ready for Google"}
            </Pill>
            <Pill tone={ready.chatgpt ? "success" : "warning"}>
              {ready.chatgpt
                ? prepared.policyChecked
                  ? "Ready for ChatGPT"
                  : "Ready for ChatGPT, policy not checked"
                : "Not ready for ChatGPT"}
            </Pill>
          </div>
          <PolicyLine prepared={prepared} />
          {fixes.map((fix) => (
            <FixRow key={`${fix.field}-${fix.kind}`} fix={fix} />
          ))}
          {findings.map((finding) => (
            <FindingRow
              key={`${finding.channel}-${finding.code}-${finding.field}`}
              finding={finding}
            />
          ))}
          {fixes.length === 0 && findings.length === 0 && (
            <p className="py-3 font-light text-foreground-dimmed text-sm">
              Nothing to fix and nothing left to resolve.
            </p>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="break-all py-3 font-mono text-primary-text text-xs underline underline-offset-2"
            >
              {url}
            </a>
          )}
        </div>
      </AccordionPanel>
    </AccordionItem>
  );
};

const Products = ({ id }: { id: string }) => {
  const prepared = usePoll<Catalog.Prepared[]>(
    `/api/agents/runs/${id}/prepared`,
    { interval: 3000, until: once },
  );

  return (
    <section className="border-accent-foreground border-t">
      <Heading
        title="Every product"
        description="What we changed, what we inferred, and what only you can resolve."
      />
      {(() => {
        switch (true) {
          case prepared.data !== null && prepared.data.length > 0:
            return (
              <Accordion multiple>
                {prepared.data.map((item) => (
                  <ProductItem key={item.product.id} prepared={item} />
                ))}
              </Accordion>
            );
          case prepared.data !== null:
            return (
              <p className="px-6 py-6 font-light text-foreground-dimmed sm:px-8">
                We didn't find any products to list.
              </p>
            );
          case prepared.missing || prepared.failed:
            return (
              <p className="px-6 py-6 font-light text-foreground-dimmed sm:px-8">
                We couldn't load the product list. Still trying.
              </p>
            );
          default:
            return (
              <p className="px-6 py-6 font-light text-foreground-dimmed sm:px-8">
                Loading the product list.
              </p>
            );
        }
      })()}
    </section>
  );
};

const Done = ({ id, summary }: { id: string; summary: Catalog.Summary }) => (
  <>
    <div className="border-accent-foreground border-t bg-background px-6 py-8 sm:px-8">
      <p className="text-balance font-medium text-3xl text-foreground md:text-4xl">
        {count(summary.fixes, "fix", "fixes")} applied,{" "}
        {summary.needsMerchant === 1
          ? "1 issue needs"
          : `${summary.needsMerchant} issues need`}{" "}
        the merchant
      </p>
    </div>

    <div className="grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
      <Channel
        label="Google & Gemini"
        channel={summary.google}
        format="XML feed"
        href={`/api/agents/runs/${id}/feed/google`}
      />
      <Channel
        label="ChatGPT"
        channel={summary.chatgpt}
        format="CSV feed"
        href={`/api/agents/runs/${id}/feed/chatgpt`}
      >
        <p className="font-light text-foreground-dimmed text-sm leading-relaxed">
          {summary.chatgpt.ready > 0
            ? "Ready for ChatGPT."
            : "No products are ready for ChatGPT yet."}{" "}
          ChatGPT only takes product feeds from approved partners, so this is
          the file you submit when you are one.
        </p>
        {summary.upload && (
          <p className="font-medium text-foreground text-sm">
            {uploadLine(summary.upload)}
          </p>
        )}
        {summary.upload?.diagnostics.map((diagnostic) => (
          <p
            key={diagnostic}
            className="font-light text-foreground-dimmed text-sm"
          >
            {diagnostic}
          </p>
        ))}
      </Channel>
    </div>

    {summary.notes.length > 0 && (
      <section className="border-accent-foreground border-t">
        <Heading title="Worth knowing" />
        <ul className="flex flex-col gap-2 bg-background px-6 py-4 sm:px-8">
          {summary.notes.map((note) => (
            <li
              key={note}
              className="font-light text-foreground-dimmed text-sm"
            >
              {note}
            </li>
          ))}
        </ul>
      </section>
    )}

    <Merchant summary={summary} />
    <Products id={id} />
  </>
);

export const Run = ({ id }: Run.Props) => {
  const { data, missing, failed } = usePoll<Snapshot>(
    `/api/agents/runs/${id}`,
    {
      interval: 1500,
      until: settled,
    },
  );

  if (!data && missing)
    return (
      <Notice
        title="We can't find this run"
        description="Runs are kept for a while, then cleared. Paste the store again to start a new one."
      />
    );

  if (!data && failed)
    return (
      <Notice
        retry={false}
        title="We can't reach this run right now"
        description="Still trying. This page picks up as soon as it answers."
      />
    );

  if (!data) return <RunSkeleton />;

  const { summary } = data;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-accent-foreground border-b bg-background-rich px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-lg">
            {summary.name ?? summary.host}
          </p>
          <p className="truncate font-mono text-foreground-dimmed text-xs">
            {summary.origin}
          </p>
        </div>
        <Button
          color="accent"
          className="shrink-0"
          render={
            <Link
              href={`/agents/stage/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Open the stage screen
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
        <Stat label="Products read" value={summary.read} />
        <Stat label="Issues found" value={summary.issues} />
        <Stat label="Fixes applied" value={summary.fixes} />
      </div>

      {summary.stage === "failed" && (
        <div className="border-accent-foreground border-t">
          <Notice
            title={stageLabels.failed}
            description={
              summary.error ?? "We couldn't finish this store. Try it again."
            }
          />
        </div>
      )}

      {summary.stage === "done" && <Done id={id} summary={summary} />}

      {summary.stage !== "done" && summary.stage !== "failed" && (
        <div className="flex flex-col gap-2 border-accent-foreground border-t bg-background px-6 py-6 sm:px-8">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <LoaderIcon className="size-4 animate-spin text-primary" />
            {stageLabels[summary.stage]}
          </p>
          <ul aria-live="polite" className="flex flex-col gap-1">
            {summary.log.slice(-5).map((line, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: log lines can repeat and only ever append
                key={`${index}-${line}`}
                className="font-light text-foreground-dimmed text-sm"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export namespace Run {
  export type Props = {
    id: string;
  };
}
