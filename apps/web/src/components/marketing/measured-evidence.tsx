import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getFormatter, getMessages, getTranslations } from "next-intl/server";
import {
  catalogFindings,
  duaEvidence,
  evidenceSources,
  simulationEvidence,
} from "@/content/marketing-evidence";
import { Link } from "@/i18n/navigation";
import DuaLogo from "@/public/partners/dua-flavours.png";
import { EvidenceFrame } from "./evidence";
import { canPublishEvidence, selectPublishedEvidence } from "./evidence-policy";
import { EvidenceMeter } from "./evidence-view";

export const SimulationEvidence = async ({
  id = "assistant-disagreement",
  collapsible = false,
}: SimulationEvidence.Props) => {
  const review = process.env["NEXT_PUBLIC_REVIEW"] === "1";
  if (!canPublishEvidence(simulationEvidence.status, review)) return null;

  const [{ enterpriseEvidence: copy }, format, translate] = await Promise.all([
    getMessages(),
    getFormatter(),
    getTranslations("enterpriseEvidence.simulations"),
  ]);
  const models = simulationEvidence.models
    .filter((model) => model.rate !== null)
    .sort((first, second) => second.rate - first.rate);
  if (models.length === 0) return null;

  const source = copy.sources[simulationEvidence.sourceKey];
  const rows = models.map((model) => ({
    id: model.id,
    label: copy.simulations.models[model.id],
    percentage: model.rate,
    value: format.number(model.rate / 100, {
      style: "percent",
      maximumFractionDigits: 1,
    }),
  }));

  return (
    <EvidenceFrame
      id={id}
      collapsible={collapsible}
      compact
      title={copy.simulations.title}
      description={copy.simulations.description}
      note={copy.simulations.takeaway}
      caption={translate("caption", {
        sampleSize: format.number(simulationEvidence.sampleSize),
      })}
      source={source}
    >
      <div className="divide-y divide-accent-foreground">
        {rows.map((row) => (
          <EvidenceMeter
            key={row.id}
            label={row.label}
            value={row.value}
            percentage={row.percentage}
            detail={`${row.label}: ${row.value}. ${copy.simulations.description}`}
            source={source}
          />
        ))}
      </div>
    </EvidenceFrame>
  );
};

export namespace SimulationEvidence {
  export type Props = { id?: string; collapsible?: boolean };
}

export const CatalogFindings = async ({
  id = "catalog-findings",
  collapsible = false,
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
    const observed =
      finding.failureCount === null
        ? translate("roundedDetail", {
            percentage: format.number(finding.percentage),
            total,
          })
        : translate("count", {
            count: format.number(finding.failureCount),
            total,
          });
    const value = finding.failureCount === null ? share : observed;
    const company = copy.findings.companies[finding.companyId];
    return {
      id: finding.id,
      label: content.label,
      company,
      percentage: finding.percentage,
      total,
      value,
      detail: `${content.label}: ${observed}${observed.endsWith(".") ? "" : "."} ${content.detail}`,
      source: copy.sources[finding.sourceKey],
    };
  });

  return (
    <EvidenceFrame
      id={id}
      collapsible={collapsible}
      compact
      title={copy.findings.title}
      note={copy.findings.note}
      caption={copy.findings.caption}
      source={copy.sources.catalogAudits2026}
      pending={review ? copy.presentation.pendingNote : undefined}
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
            direction="lower-is-better"
            meta={`${row.company} · ${copy.findings.headers.total}: ${row.total}`}
          />
        ))}
      </div>
    </EvidenceFrame>
  );
};

export namespace CatalogFindings {
  export type Props = { id?: string; collapsible?: boolean };
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
        <p className="whitespace-nowrap font-body font-medium text-7xl lg:text-8xl xl:text-9xl text-primary proportional-nums leading-none tracking-tighter">
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

/** No primary market statistic is verified yet, including in review mode. */
export const MarketEvidence = (_props: MarketEvidence.Props) => null;

export namespace MarketEvidence {
  export type Props = { id?: string };
}
