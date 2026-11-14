"use client";

import {
  CheckCircleIcon,
  CheckIcon,
  CircleMinusIcon,
  SearchIcon,
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
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AnalysisText } from "@/components/analysis-text";
import type * as Brand from "@/server/app/intelligence/brand";
import { EntityMark } from "./entity-mark";

const filters = ["all", "mentioned", "absent"] as const;
type Filter = (typeof filters)[number];

export namespace QueryExplorer {
  export type Props = { queries: Brand.QueryResult[] };
}

export const QueryExplorer = ({ queries }: QueryExplorer.Props) => {
  const translate = useTranslations("dashboard.brand.answers");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const normalized = search.normalize("NFKC").toLocaleLowerCase(locale).trim();
  const matches = queries
    .map((query, index) => ({ query, index }))
    .filter(({ query }) => {
      const matchesMention =
        filter === "all" ||
        (filter === "mentioned" ? query.mentioned : !query.mentioned);
      const content = [query.query, query.answer, ...query.brands]
        .join(" ")
        .normalize("NFKC")
        .toLocaleLowerCase(locale);
      return matchesMention && (!normalized || content.includes(normalized));
    });
  const hasFilters = normalized.length > 0 || filter !== "all";

  const clear = () => {
    setSearch("");
    setFilter("all");
  };

  return (
    <section className="min-w-0 bg-background-rich">
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-4 sm:px-6">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
            {translate("title")}
          </h2>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>
        <p
          role="status"
          className="text-foreground-dimmed text-sm tabular-nums"
        >
          {translate("count", { count: matches.length, total: queries.length })}
        </p>
      </div>
      <div className="flex flex-col gap-3 border-accent-foreground border-b px-5 pb-5 sm:flex-row sm:px-6">
        <TextField
          value={search}
          onValueChange={setSearch}
          className="min-w-0 flex-1 bg-background-rich"
        >
          <SearchIcon
            aria-hidden
            className="ml-1 size-4 shrink-0 text-foreground-dimmed"
          />
          <TextFieldInput
            aria-label={translate("search")}
            placeholder={translate("search")}
            className="text-sm"
          />
        </TextField>
        <Select
          value={filter}
          onValueChange={(value) => {
            const match = filters.find((item) => item === value);
            if (match) setFilter(match);
          }}
        >
          <SelectTrigger
            aria-label={translate("filter")}
            className="min-w-44 bg-background-rich text-sm"
          >
            <SelectValue>{() => translate(`filters.${filter}`)}</SelectValue>
          </SelectTrigger>
          <SelectPositioner align="end">
            <SelectPopup className="bg-background-rich">
              {filters.map((value) => (
                <SelectItem
                  key={value}
                  value={value}
                  label={translate(`filters.${value}`)}
                >
                  {translate(`filters.${value}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
      </div>
      {matches.length > 0 ? (
        <Accordion multiple className="justify-start">
          {matches.map(({ query, index }) => {
            const position = query.mentioned ? query.position : "absent";
            const Icon =
              position === "top"
                ? CheckCircleIcon
                : position === "listed"
                  ? CheckIcon
                  : CircleMinusIcon;
            return (
              <AccordionItem
                key={`${query.engine}-${index}`}
                value={index}
                className="border-accent-foreground last:border-b-0"
              >
                <AccordionTrigger
                  className="items-center gap-4 px-5 py-4 hover:bg-background focus-visible:outline-primary sm:px-6"
                  classList={{
                    trigger: {
                      icon: "mr-0 size-4 shrink-0 group-data-panel-open:rotate-180 motion-reduce:transition-none",
                    },
                  }}
                >
                  <EntityMark
                    name={query.engine}
                    kind="engine"
                    className="self-start"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="wrap-anywhere font-medium text-foreground-rich text-sm leading-6">
                      {query.query}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-normal text-foreground-dimmed text-xs">
                      <span>{query.engine}</span>
                      <span>
                        {translate(
                          query.branded ? "context.named" : "context.unbranded",
                        )}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-medium",
                          position === "absent"
                            ? "text-foreground-dimmed"
                            : "text-primary-text",
                        )}
                      >
                        <Icon aria-hidden className="size-3.5 shrink-0" />
                        {translate(`position.${position}`)}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel className="motion-reduce:transition-none">
                  <div className="border-accent-foreground border-t bg-background px-5 py-5 sm:px-6">
                    <h3 className="font-semibold text-foreground-rich text-sm">
                      {translate("answer")}
                    </h3>
                    <p className="wrap-anywhere mt-2 whitespace-pre-line text-foreground text-sm leading-7">
                      <AnalysisText
                        text={query.answer.trim() || translate("noAnswer")}
                        terms={[
                          ...query.brands,
                          ...query.sources,
                          query.engine,
                        ]}
                      />
                    </p>
                  </div>
                  <div className="grid border-accent-foreground border-t sm:grid-cols-2">
                    <div className="min-w-0 px-5 py-5 sm:px-6">
                      <h3 className="font-semibold text-foreground-rich text-sm">
                        {translate("brands")}
                      </h3>
                      {query.brands.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-foreground text-sm leading-6">
                          {[...new Set(query.brands)].map((brand) => (
                            <li
                              key={brand}
                              className="wrap-anywhere flex min-w-0 items-center gap-2"
                            >
                              <EntityMark name={brand} className="size-7" />
                              {brand}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-foreground-dimmed text-sm">
                          {translate("noBrands")}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0 border-accent-foreground border-t px-5 py-5 sm:border-t-0 sm:border-l sm:px-6">
                      <h3 className="font-semibold text-foreground-rich text-sm">
                        {translate("sources")}
                      </h3>
                      {query.sources.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-foreground text-sm leading-6">
                          {[...new Set(query.sources)].map((source) => (
                            <li
                              key={source}
                              className="wrap-anywhere flex min-w-0 items-center gap-3"
                            >
                              <EntityMark
                                name={source}
                                kind="source"
                                className="size-7"
                              />
                              <span className="min-w-0">{source}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-foreground-dimmed text-sm">
                          {translate("noSources")}
                        </p>
                      )}
                      <p className="mt-3 text-foreground-dimmed text-xs leading-5">
                        {translate("sourcesNote")}
                      </p>
                    </div>
                  </div>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="px-5 py-10 sm:px-6">
          <h3 className="font-semibold text-base text-foreground-rich">
            {translate("empty.title")}
          </h3>
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate(
              queries.length === 0 ? "empty.saved" : "empty.description",
            )}
          </p>
          {hasFilters && (
            <Button
              variant="soft"
              color="emphasis"
              onClick={clear}
              className="mt-5"
            >
              {translate("action.primary")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};
