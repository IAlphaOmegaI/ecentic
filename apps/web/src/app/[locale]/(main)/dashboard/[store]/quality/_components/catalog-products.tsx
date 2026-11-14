"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  FileIcon,
  FileSearchIcon,
  SearchIcon,
  ShareIcon,
  ShieldCheckIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  Popover,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
} from "@zenncore/web/components/select";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type {
  Finding,
  ListingReport,
  ListingStatus,
  Surface,
} from "@/server/app/intelligence/listing-quality";
import { SURFACES } from "@/server/app/intelligence/listing-rules";
import { AffectedProducts, ProductIdentity } from "./affected-products";
import {
  type QualityScope,
  qualityFindings,
  qualityIssues,
  qualityStatus,
  qualitySummary,
} from "./quality-data";

const scopes = ["all", ...SURFACES] as const;
const severities = ["all", "blocker", "warning", "info", "ready"] as const;
type SeverityFilter = (typeof severities)[number];

const SurfaceMark = ({ surface }: { surface: Surface }) => {
  if (surface === "universal")
    return (
      <ShieldCheckIcon
        className="size-4 shrink-0 text-foreground-dimmed"
        aria-hidden
      />
    );
  return (
    <Image
      src={`/images/${surface === "google" ? "google" : "chatgpt"}.svg`}
      width={16}
      height={16}
      alt=""
      className="size-4 shrink-0"
    />
  );
};

const Status = ({ status }: { status: ListingStatus }) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  return (
    <span className="inline-flex items-center gap-2 font-medium text-foreground text-xs">
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          status === "blocker"
            ? "bg-error"
            : status === "warning"
              ? "bg-warning"
              : status === "info"
                ? "bg-foreground-dimmed"
                : "bg-success",
        )}
      />
      {translate(`status.${status}`)}
    </span>
  );
};

const FindingMark = ({ status }: { status: ListingStatus }) => {
  const Icon =
    status === "ready"
      ? CheckCircleIcon
      : status === "info"
        ? FileIcon
        : AlertCircleIcon;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        status === "blocker"
          ? "bg-error/10 text-error-dimmed"
          : status === "warning"
            ? "bg-warning/10 text-warning-dimmed"
            : status === "info"
              ? "bg-foreground/5 text-foreground-dimmed"
              : "bg-success/10 text-success-dimmed",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
};

export const PlatformVerdicts = ({
  finding,
  scope = "all",
}: {
  finding: Finding;
  scope?: QualityScope;
}) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {finding.universal && (scope === "all" || scope === "universal") && (
        <span className="flex items-center gap-2 text-foreground-dimmed text-xs">
          <SurfaceMark surface="universal" />
          {translate("scope.universal")}
          <Status status={finding.universal} />
        </span>
      )}
      {finding.platforms
        .filter((entry) => scope === "all" || entry.platform === scope)
        .map((entry) => (
          <a
            key={entry.platform}
            href={entry.verdict.reference}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-sm text-foreground-dimmed text-xs underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            aria-label={translate("reference", {
              surface: translate(`scope.${entry.platform}`),
            })}
          >
            <SurfaceMark surface={entry.platform} />
            {translate(`scope.${entry.platform}`)}
            <Status status={entry.verdict.severity} />
            <ShareIcon className="size-4" aria-hidden />
          </a>
        ))}
    </div>
  );
};

export const QualitySummary = ({ products }: { products: ListingReport[] }) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  const formatter = useFormatter();
  return (
    <section aria-label={translate("summary.label")}>
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-semibold text-base text-foreground-rich">
            {translate("summary.title")}
          </h2>
          <p className="mt-1 text-foreground-dimmed text-xs">
            {translate("summary.count", { count: products.length })}
          </p>
        </div>
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" color="neutral" />}>
            <FileSearchIcon className="size-4" />
            {translate("method.title")}
          </PopoverTrigger>
          <PopoverPositioner side="bottom" align="end">
            <PopoverPopup className="max-w-80 rounded-lg shadow-sm">
              <PopoverTitle className="font-semibold text-foreground-rich">
                {translate("method.title")}
              </PopoverTitle>
              <p className="mt-2 text-foreground-dimmed text-sm leading-6">
                {translate("method.description")}
              </p>
            </PopoverPopup>
          </PopoverPositioner>
        </Popover>
      </div>
      <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-t">
        {SURFACES.map((surface) => {
          const summary = qualitySummary(products, surface);
          if (!summary) return null;
          return (
            <div key={surface} className="min-w-0 px-4 py-4 sm:px-6">
              <div className="flex min-h-10 items-start gap-2 font-medium text-foreground text-xs sm:min-h-8 sm:text-sm">
                <SurfaceMark surface={surface} />
                <span className="min-w-0 break-words">
                  {translate(`scope.${surface}`)}
                </span>
              </div>
              <p className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums sm:text-3xl">
                {summary.readyShare === null
                  ? "—"
                  : formatter.number(summary.readyShare / 100, {
                      style: "percent",
                      maximumFractionDigits: 0,
                    })}
              </p>
              <div
                className="mt-4 flex h-2 overflow-hidden rounded-full bg-accent-foreground"
                role="img"
                aria-label={translate("summary.breakdown", {
                  blocker: formatter.number(summary.blocker),
                  warning: formatter.number(summary.warning),
                  info: formatter.number(summary.info),
                  ready: formatter.number(summary.ready),
                })}
              >
                {(["blocker", "warning", "info", "ready"] as const).map(
                  (status) => (
                    <span
                      key={status}
                      className={
                        status === "blocker"
                          ? "bg-error"
                          : status === "warning"
                            ? "bg-warning"
                            : status === "info"
                              ? "bg-foreground-dimmed"
                              : "bg-success"
                      }
                      style={{
                        width: `${summary.total ? (summary[status] / summary.total) * 100 : 0}%`,
                      }}
                    />
                  ),
                )}
              </div>
              <p className="mt-2 text-foreground-dimmed text-xs tabular-nums">
                {translate("summary.passing", {
                  count: formatter.number(summary.ready + summary.info),
                  total: formatter.number(summary.total),
                })}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 pb-4 sm:px-6">
        {(["blocker", "warning", "info", "ready"] as const).map((status) => (
          <Status key={status} status={status} />
        ))}
      </div>
    </section>
  );
};

const FilterFeedback = ({
  clear,
  empty = false,
}: {
  clear: () => void;
  empty?: boolean;
}) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center"
      role="status"
    >
      <FindingMark status={empty ? "ready" : "info"} />
      <h3 className="font-semibold text-foreground-rich text-lg">
        {translate(empty ? "states.clear.title" : "states.noMatches.title")}
      </h3>
      <p className="max-w-md text-foreground-dimmed text-sm leading-6">
        {translate(
          empty ? "states.clear.description" : "states.noMatches.description",
        )}
      </p>
      {!empty && (
        <Button variant="soft" color="neutral" onClick={clear}>
          {translate("action.tertiary")}
        </Button>
      )}
    </div>
  );
};

export const QualityWorkspace = ({
  products,
  store,
}: {
  products: ListingReport[];
  store: string;
}) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  const rules = useTranslations("dashboard.quality.rules");
  const formatter = useFormatter();
  const [{ scope, severity, search, view: tab }, setFilters] = useQueryStates({
    scope: parseAsStringLiteral(scopes).withDefault("all"),
    severity: parseAsStringLiteral(severities).withDefault("all"),
    search: parseAsString.withDefault(""),
    view: parseAsStringLiteral(["issues", "products"] as const).withDefault(
      "issues",
    ),
  });
  const [limit, setLimit] = useState(20);
  const query = search.trim().toLocaleLowerCase();
  const clear = () => {
    void setFilters({ search: null, scope: null, severity: null });
    setLimit(20);
  };
  const allIssues = qualityIssues(products, scope);
  const issues = allIssues.filter(
    (issue) =>
      (severity === "all" || issue.severity === severity) &&
      (!query ||
        rules(`${issue.rule}.title`).toLocaleLowerCase().includes(query) ||
        issue.products.some((product) =>
          `${product.title} ${product.id}`.toLocaleLowerCase().includes(query),
        )),
  );
  const filteredProducts = products.filter(
    (product) =>
      (severity === "all" || qualityStatus(product, scope) === severity) &&
      (!query ||
        `${product.title} ${product.id}`.toLocaleLowerCase().includes(query) ||
        qualityFindings(product, scope).some((finding) =>
          rules(`${finding.rule}.title`).toLocaleLowerCase().includes(query),
        )),
  );
  const filtered = Boolean(query || severity !== "all" || scope !== "all");
  return (
    <div className="min-w-0">
      <QualitySummary products={products} />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value !== "issues" && value !== "products") return;
          void setFilters({
            view: value,
            severity:
              value === "issues" && severity === "ready" ? "all" : severity,
          });
          setLimit(20);
        }}
      >
        <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-y px-4 py-4 sm:px-6">
          <TabsList aria-label={translate("views.label")}>
            <Tab value="issues">{translate("views.issues")}</Tab>
            <Tab value="products">{translate("views.products")}</Tab>
            <TabsIndicator />
          </TabsList>
          <span
            className="ml-auto text-foreground-dimmed text-xs"
            aria-live="polite"
          >
            {translate(tab === "issues" ? "issueCount" : "productCount", {
              count: tab === "issues" ? issues.length : filteredProducts.length,
            })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
          <TextField
            value={search}
            onValueChange={(value) => {
              void setFilters({ search: value ?? "" });
              setLimit(20);
            }}
            className="min-w-48 flex-1"
          >
            <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
            <TextFieldInput
              aria-label={translate("search")}
              placeholder={translate("search")}
            />
            {search && (
              <Button
                variant="ghost"
                color="neutral"
                size="icon"
                onClick={() => void setFilters({ search: null })}
                aria-label={translate("searchAction.primary")}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </TextField>
          <Select
            value={scope}
            onValueChange={(value) => {
              if (scopes.includes(value as QualityScope)) {
                void setFilters({ scope: value as QualityScope });
                setLimit(20);
              }
            }}
          >
            <SelectTrigger
              aria-label={translate("scope.label")}
              className="min-w-36"
            >
              <span>{translate(`scope.${scope}`)}</span>
            </SelectTrigger>
            <SelectPositioner align="end">
              <SelectPopup>
                {scopes.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translate(`scope.${value}`)}
                  </SelectItem>
                ))}
              </SelectPopup>
            </SelectPositioner>
          </Select>
          <Select
            value={severity}
            onValueChange={(value) => {
              if (severities.includes(value as SeverityFilter)) {
                void setFilters({ severity: value as SeverityFilter });
                setLimit(20);
              }
            }}
          >
            <SelectTrigger
              aria-label={translate("status.label")}
              className="min-w-36"
            >
              <span>{translate(`status.${severity}`)}</span>
            </SelectTrigger>
            <SelectPositioner align="end">
              <SelectPopup>
                {severities
                  .filter((value) => tab === "products" || value !== "ready")
                  .map((value) => (
                    <SelectItem key={value} value={value}>
                      {translate(`status.${value}`)}
                    </SelectItem>
                  ))}
              </SelectPopup>
            </SelectPositioner>
          </Select>
        </div>
        <TabsPanel value="issues">
          <p className="border-accent-foreground border-b px-4 py-4 text-foreground-dimmed text-xs leading-5 sm:px-6">
            {translate("issuesHint")}
          </p>
          {!issues.length ? (
            <FilterFeedback
              clear={clear}
              empty={!filtered && allIssues.length === 0}
            />
          ) : (
            <Accordion key={`${scope}:${severity}:${query}`} multiple>
              {issues.map((issue) => (
                <AccordionItem
                  key={issue.rule}
                  value={issue.rule}
                  className="border-accent-foreground last:border-b-0"
                >
                  <AccordionTrigger
                    className="items-center px-4 py-4 sm:px-6"
                    classList={{ trigger: { icon: "hidden" } }}
                  >
                    <FindingMark status={issue.severity} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-base text-foreground-rich">
                        {rules(`${issue.rule}.title`)}
                      </span>
                      <span className="mt-2 block">
                        <Status status={issue.severity} />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-foreground-rich text-xl tabular-nums">
                        {formatter.number(issue.count)}
                      </span>
                      <span className="text-foreground-dimmed text-xs">
                        {translate("productsLabel")}
                      </span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-foreground-dimmed transition-transform group-data-panel-open:rotate-90 motion-reduce:transition-none" />
                  </AccordionTrigger>
                  <AccordionPanel>
                    <div className="border-accent-foreground border-t bg-background px-4 py-4 sm:px-6">
                      <p className="mb-4 max-w-3xl text-foreground text-sm leading-6">
                        {rules(`${issue.rule}.detail`)}
                      </p>
                      <PlatformVerdicts finding={issue} scope={scope} />
                    </div>
                    <AffectedProducts store={store} products={issue.products} />
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsPanel>
        <TabsPanel value="products">
          {!filteredProducts.length ? (
            <FilterFeedback clear={clear} />
          ) : (
            <>
              <Accordion key={`${scope}:${severity}:${query}`} multiple>
                {filteredProducts.slice(0, limit).map((product) => {
                  const findings = qualityFindings(product, scope);
                  return (
                    <AccordionItem
                      key={product.id}
                      value={product.id}
                      className="border-accent-foreground last:border-b-0"
                    >
                      <AccordionTrigger
                        className="items-center px-4 py-4 sm:px-6"
                        classList={{ trigger: { icon: "hidden" } }}
                      >
                        <span className="min-w-0 flex-1">
                          <ProductIdentity product={product} />
                          <span className="mt-2 flex flex-wrap gap-4">
                            <Status status={qualityStatus(product, scope)} />
                            <span className="text-foreground-dimmed text-xs">
                              {translate("findings", {
                                count: findings.length,
                              })}
                            </span>
                          </span>
                        </span>
                        <ChevronRightIcon className="size-4 shrink-0 text-foreground-dimmed transition-transform group-data-panel-open:rotate-90 motion-reduce:transition-none" />
                      </AccordionTrigger>
                      <AccordionPanel>
                        <div className="border-accent-foreground border-t bg-background">
                          {findings.length ? (
                            findings.map((finding) => (
                              <div
                                key={finding.rule}
                                className="border-accent-foreground border-b px-4 py-4 sm:px-6"
                              >
                                <h3 className="font-semibold text-foreground-rich text-sm">
                                  {rules(`${finding.rule}.title`)}
                                </h3>
                                <p className="mt-2 mb-4 max-w-3xl text-foreground-dimmed text-sm leading-6">
                                  {rules(`${finding.rule}.detail`)}
                                </p>
                                <PlatformVerdicts
                                  finding={finding}
                                  scope={scope}
                                />
                              </div>
                            ))
                          ) : (
                            <p className="px-4 py-4 text-foreground-dimmed text-sm sm:px-6">
                              {translate("noFindings")}
                            </p>
                          )}
                          <div className="px-4 py-4 sm:px-6">
                            <AffectedProductLink
                              store={store}
                              product={product}
                            />
                          </div>
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              {filteredProducts.length > limit && (
                <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
                  <Button
                    variant="soft"
                    color="neutral"
                    onClick={() => setLimit((current) => current + 20)}
                  >
                    {translate("action.quaternary")}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsPanel>
      </Tabs>
    </div>
  );
};

const AffectedProductLink = ({
  store,
  product,
}: {
  store: string;
  product: ListingReport;
}) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  return (
    <Button
      variant="soft"
      color="neutral"
      render={<Link href={`/dashboard/${store}/products/${product.id}`} />}
    >
      {translate("productAction.primary")}
    </Button>
  );
};
