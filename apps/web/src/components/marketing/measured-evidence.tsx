import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import {
  catalogFindings,
  duaEvidence,
  evidenceSources,
  marketContext,
  simulationEvidence,
} from "@/content/marketing-evidence";
import { Link } from "@/i18n/navigation";
import DuaLogo from "@/public/partners/dua-flavours.png";
import { EvidenceArtwork } from "./animated-ascii";
import { EvidenceFrame } from "./evidence";
import { canPublishEvidence, selectPublishedEvidence } from "./evidence-policy";
import { EvidenceMeter } from "./evidence-view";

export const SimulationEvidence = async ({
  id = "assistant-disagreement",
}: SimulationEvidence.Props) => {
  const review = process.env["NEXT_PUBLIC_REVIEW"] === "1";
  if (!canPublishEvidence(simulationEvidence.status, review)) return null;

  const [{ enterpriseEvidence: copy }, format, translate] = await Promise.all([
    getMessages(),
    getFormatter(),
    getTranslations("enterpriseEvidence.simulations"),
  ]);
  const models = [...simulationEvidence.models].sort(
    (first, second) => (second.rate ?? -1) - (first.rate ?? -1),
  );
  const source = copy.sources[simulationEvidence.sourceKey];
  const rows = models.map((model) => ({
    id: model.id,
    label: copy.simulations.models[model.id],
    percentage: model.rate,
    value:
      model.rate === null
        ? copy.simulations.ratePending
        : format.number(model.rate / 100, {
            style: "percent",
            maximumFractionDigits: 1,
          }),
    count:
      model.count === null
        ? copy.presentation.unknown
        : format.number(model.count),
    total:
      model.total === null
        ? copy.presentation.unknown
        : format.number(model.total),
  }));

  return (
    <EvidenceFrame
      id={id}
      title={copy.simulations.title}
      description={copy.simulations.description}
      note={copy.simulations.takeaway}
      caption={translate("caption", {
        sampleSize: format.number(simulationEvidence.sampleSize),
      })}
      source={source}
      pending={review ? copy.simulations.pending : undefined}
      columns={[
        copy.simulations.headers.model,
        copy.simulations.headers.rate,
        copy.simulations.headers.count,
        copy.simulations.headers.total,
      ]}
      rows={rows.map((row) => [row.label, row.value, row.count, row.total])}
    >
      <div className="divide-y divide-accent-foreground">
        {rows.map((row) => (
          <EvidenceMeter
            key={row.id}
            label={row.label}
            value={row.value}
            percentage={row.percentage}
            detail={`${row.label}: ${row.value}. ${copy.simulations.countsPending} ${copy.simulations.methodPending}`}
            source={source}
            pending={
              row.percentage === null
                ? copy.presentation.dataPending
                : undefined
            }
          />
        ))}
      </div>
    </EvidenceFrame>
  );
};

export namespace SimulationEvidence {
  export type Props = { id?: string };
}

export const CatalogFindings = async ({
  id = "catalog-findings",
}: CatalogFindings.Props) => {
  const review = process.env["NEXT_PUBLIC_REVIEW"] === "1";
  const findings = selectPublishedEvidence(catalogFindings, review);
  if (findings.length === 0) return null;

  const [{ enterpriseEvidence: copy }, format, translate] = await Promise.all([
    getMessages(),
    getFormatter(),
    getTranslations("enterpriseEvidence.findings"),
  ]);
  const rows = findings.map((finding) => {
    const content = copy.findings.rows[finding.id];
    const share = format.number(finding.percentage / 100, { style: "percent" });
    const total = format.number(finding.total);
    const count =
      finding.failureCount === null
        ? copy.presentation.unknown
        : format.number(finding.failureCount);
    const observed =
      finding.failureCount === null
        ? translate("roundedDetail", {
            percentage: format.number(finding.percentage),
            total,
          })
        : translate("count", { count, total });
    const value = finding.failureCount === null ? share : observed;
    const company = copy.findings.companies[finding.companyId];
    const pending =
      finding.approval === "pending"
        ? copy.presentation.approvalPending
        : undefined;

    return {
      id: finding.id,
      label: content.label,
      company,
      percentage: finding.percentage,
      share,
      total,
      count,
      value,
      detail: `${content.label}: ${observed}${observed.endsWith(".") ? "" : "."} ${content.detail}`,
      source: copy.sources[finding.sourceKey],
      pending,
    };
  });

  return (
    <EvidenceFrame
      id={id}
      compact
      title={copy.findings.title}
      note={copy.findings.note}
      caption={copy.findings.caption}
      source={copy.sources.catalogAudits2026}
      pending={review ? copy.presentation.pendingNote : undefined}
      columns={[
        copy.findings.headers.finding,
        copy.findings.headers.company,
        copy.findings.headers.share,
        copy.findings.headers.count,
        copy.findings.headers.total,
      ]}
      rows={rows.map((row) => [
        row.pending ? `${row.label} (${row.pending})` : row.label,
        row.company,
        row.share,
        row.count,
        row.total,
      ])}
    >
      <div className="divide-y divide-accent-foreground">
        {rows.map((row) => (
          <EvidenceMeter
            key={row.id}
            label={row.label}
            value={row.value}
            percentage={row.percentage}
            detail={row.detail}
            source={row.source}
            meta={`${row.company} · ${copy.findings.headers.total}: ${row.total}`}
            pending={row.pending}
          />
        ))}
      </div>
    </EvidenceFrame>
  );
};

export namespace CatalogFindings {
  export type Props = { id?: string };
}

export const DuaEvidence = async ({
  id = "dua-pilot-evidence",
}: DuaEvidence.Props) => {
  if (!canPublishEvidence(duaEvidence.status)) return null;

  const [{ enterpriseEvidence: copy }, translate] = await Promise.all([
    getMessages(),
    getTranslations("enterpriseEvidence.dua"),
  ]);
  const figure = translate("figure", {
    percentage: String(duaEvidence.changePercent),
  });
  const source = copy.sources[duaEvidence.sourceKey];

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="marketing-grid marketing-section-grid relative grid border-accent-foreground border-t md:grid-cols-2"
      data-columns="2"
    >
      <div className="relative flex min-w-0 flex-col items-start gap-6 px-7 py-10 max-sm:px-4">
        <Image
          src={DuaLogo}
          alt="DUA Flavours"
          className="h-12 w-auto max-w-full object-contain object-left"
        />
        <h3 id={`${id}-title`}>{copy.dua.title}</h3>
        <p className="max-w-[48ch] text-foreground-dimmed text-lg leading-relaxed">
          {copy.dua.caption}
        </p>
        <p className="flex items-center gap-2 text-foreground-dimmed text-sm">
          <CheckIcon aria-hidden className="size-4 shrink-0 text-success" />
          {copy.dua.permission}
        </p>
        <div className="mt-auto pt-2">
          <Button render={<Link href={duaEvidence.href} />}>
            {copy.dua.action.primary}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative flex min-w-0 flex-col justify-center gap-4 border-accent-foreground border-t bg-background-dimmed px-7 py-10 max-sm:px-4 md:border-t-0 md:border-l">
        <p className="font-heading font-medium text-[clamp(5rem,10vw,9rem)] text-primary tabular-nums leading-none tracking-[-0.06em]">
          {figure}
        </p>
        <p className="max-w-[28ch] text-foreground text-xl leading-snug">
          {copy.dua.metric}
        </p>
        <p className="text-foreground text-sm">{copy.dua.period}</p>
        <p className="mt-4 max-w-[48ch] text-foreground text-sm leading-relaxed">
          {copy.dua.note}
        </p>
        <Link
          href={evidenceSources.duaPilot.href}
          className="w-fit text-foreground text-xs underline decoration-accent-dimmed underline-offset-4 hover:text-primary-text"
        >
          {source}
        </Link>
      </div>
    </section>
  );
};

export namespace DuaEvidence {
  export type Props = { id?: string };
}

export const MarketEvidence = async ({
  id = "market-context-review",
}: MarketEvidence.Props) => {
  if (process.env["NEXT_PUBLIC_REVIEW"] !== "1") return null;

  const { enterpriseEvidence: copy } = await getMessages();

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative mt-8 border-accent-foreground border-t bg-background-dimmed px-7 py-8 max-sm:px-4"
    >
      <EvidenceArtwork
        kind="market"
        className="pointer-events-none absolute top-4 right-0 hidden text-primary/30 lg:block"
      />
      <h3 id={`${id}-title`} className="relative">
        {copy.market.title}
      </h3>
      <p className="relative mt-4 max-w-[60ch] text-foreground">
        {copy.market.description}
      </p>
      <div className="relative mt-6 grid gap-6 md:grid-cols-3">
        {marketContext.map((item) => (
          <figure
            key={item.id}
            className="border-accent-foreground border-t pt-4"
          >
            <p className="font-medium text-foreground-rich">
              {copy.market.rows[item.id]}
            </p>
            <p className="mt-3 text-foreground">
              {copy.presentation.dataPending}
            </p>
            <figcaption className="mt-4 text-foreground text-sm">
              {copy.presentation.source}: {copy.sources[item.sourceKey]}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export namespace MarketEvidence {
  export type Props = { id?: string };
}
