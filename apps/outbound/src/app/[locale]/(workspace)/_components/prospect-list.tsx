"use client";
import {
  ChevronDownIcon,
  FilterIcon,
  LoaderIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from "@zenncore/icons";
import { useStableCallback } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import {
  Popover,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import {
  Sheet,
  SheetDescription,
  SheetPopup,
  SheetTitle,
} from "@zenncore/web/components/sheet";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { PROSPECT_LIFECYCLES } from "@/lib/outbound-prospect-progress";
import {
  type ProspectList as ProspectPage,
  type ProspectQuery,
  parseProspectQuery,
  prospectsHref,
} from "@/lib/outbound-prospects";
import { LINKEDIN_STATUSES, PROSPECT_STATUSES } from "@/lib/outbound-status";
import { ProspectTable } from "./prospect-table";
import { Empty } from "./status";

const ImportForm = dynamic(() =>
  import("./prospect-import").then((module) => module.ImportForm),
);
const PreparationBatch = dynamic(() =>
  import("./preparation").then((module) => module.PreparationBatch),
);

export const ProspectList = ({
  queue,
  query,
  manualPreparation,
}: ProspectList.Props) => {
  const translate = useTranslations("outbound");
  const router = useRouter();
  const [search, setSearch] = useState(query.q);
  const pendingSearch = useRef<string | null>(null);
  const pendingQuery = useRef<ProspectQuery | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const actionsTrigger = useRef<HTMLButtonElement>(null);
  const currentQuery = { ...query, page: queue.page };
  const currentHref = prospectsHref(currentQuery);
  const navigate = useStableCallback((next: ProspectQuery, replace = false) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const normalized = parseProspectQuery(next);
    const href = prospectsHref(normalized);
    const pendingHref = pendingQuery.current
      ? prospectsHref(pendingQuery.current)
      : null;
    if (href === pendingHref || (href === currentHref && !pendingHref)) return;
    pendingQuery.current = normalized;
    startRefresh(() =>
      replace
        ? router.replace(href, { scroll: false })
        : router.push(href, { scroll: false }),
    );
  });
  useEffect(() => {
    if (
      pendingQuery.current &&
      prospectsHref(pendingQuery.current) === currentHref
    )
      pendingQuery.current = null;
    if (pendingSearch.current === null || pendingSearch.current === query.q) {
      pendingSearch.current = null;
      setSearch(query.q);
    }
  }, [query, currentHref]);
  useEffect(() => {
    const latest = pendingQuery.current ?? query;
    if (
      pendingSearch.current === null ||
      parseProspectQuery({ q: search }).q === latest.q
    )
      return;
    const timer = setTimeout(() => {
      searchTimer.current = null;
      navigate(
        { ...(pendingQuery.current ?? query), q: search, page: 1 },
        true,
      );
    }, 300);
    searchTimer.current = timer;
    return () => clearTimeout(timer);
  }, [search, query, navigate]);
  const { status, lifecycle, linkedin } = query;
  const filterCount = [status, lifecycle, linkedin].filter(
    (value) => value !== "all",
  ).length;
  const { total } = queue;
  const activeFilter = Boolean(search) || filterCount > 0;
  const statusItems = [
    { value: "all", label: translate("prospect.list.allStatuses") },
    ...PROSPECT_STATUSES.map((value) => ({
      value,
      label: translate(`status.${value}`),
    })),
  ];
  const lifecycleItems = [
    { value: "all", label: translate("prospect.progress.allLifecycle") },
    ...PROSPECT_LIFECYCLES.map((value) => ({
      value,
      label: translate(`prospect.progress.lifecycle.${value}`),
    })),
  ];
  const linkedinItems = [
    { value: "all", label: translate("prospect.progress.allLinkedin") },
    ...LINKEDIN_STATUSES.map((value) => ({
      value,
      label: translate(`linkedin.status.${value}`),
    })),
  ];
  const clear = () => {
    pendingSearch.current = pendingQuery.current ? "" : null;
    setSearch("");
    navigate({
      q: "",
      status: "all",
      lifecycle: "all",
      linkedin: "all",
      page: 1,
    });
  };
  return (
    <>
      <div className="space-y-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            className="flex items-center gap-2 font-medium text-foreground-rich text-sm tabular-nums"
            role="status"
          >
            {refreshing ? (
              <>
                <LoaderIcon
                  aria-hidden
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                {translate("prospect.list.toolbar.refreshing")}
              </>
            ) : (
              translate("prospect.list.count", { count: total })
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/prospects/new" />}>
              <PlusIcon aria-hidden />
              {translate("prospect.newTitle")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                ref={actionsTrigger}
                render={<Button variant="soft" color="neutral" />}
              >
                {translate("prospect.list.toolbar.more")}
                <ChevronDownIcon aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <UploadIcon aria-hidden className="size-4" />
                  {translate("import.action.primary")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={refreshing}
                  onClick={() => startRefresh(() => router.refresh())}
                >
                  {translate("prospect.progress.action.primary")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/sent" />}>
                  {translate("nav.sent")}
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/campaigns" />}>
                  {translate("prospect.progress.action.tertiary")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-40 flex-1">
            <TextField
              value={search}
              onValueChange={(value) => {
                const normalized = parseProspectQuery({ q: value }).q;
                pendingSearch.current =
                  normalized === query.q && !pendingQuery.current
                    ? null
                    : normalized;
                setSearch(value);
              }}
            >
              <SearchIcon
                aria-hidden
                className="ml-4 size-4 shrink-0 text-foreground-dimmed"
              />
              <TextFieldInput
                aria-label={translate("prospect.search")}
                placeholder={translate("prospect.search")}
                className="text-sm"
              />
            </TextField>
          </div>
          <Popover>
            <PopoverTrigger
              render={({ className: _className, ...props }) => (
                <Button {...props} variant="soft" color="neutral" />
              )}
            >
              <FilterIcon aria-hidden />
              {translate("prospect.list.toolbar.filters")}
              {filterCount > 0 && <span>({filterCount})</span>}
            </PopoverTrigger>
            <PopoverPositioner align="end" className="z-40">
              <PopoverPopup className="w-80 max-w-[calc(100vw-2rem)] space-y-4 bg-background-rich p-4 motion-reduce:transition-none">
                <PopoverTitle>
                  {translate("prospect.list.toolbar.filters")}
                </PopoverTitle>
                {[
                  {
                    key: "status",
                    value: status,

                    items: statusItems,
                    label: translate("prospect.list.toolbar.pipelineStatus"),
                  },
                  {
                    key: "lifecycle",
                    value: lifecycle,

                    items: lifecycleItems,
                    label: translate("prospect.progress.lifecycleFilter"),
                  },
                  {
                    key: "linkedin",
                    value: linkedin,

                    items: linkedinItems,
                    label: translate("prospect.progress.linkedinFilter"),
                  },
                ].map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <p className="text-foreground-dimmed text-xs">
                      {filter.label}
                    </p>
                    <Select
                      items={filter.items}
                      value={filter.value}
                      onValueChange={(value) => {
                        navigate({
                          ...currentQuery,
                          q: search,
                          [filter.key]: value ?? "all",
                          page: 1,
                        });
                      }}
                    >
                      <SelectTrigger
                        aria-label={filter.label}
                        className="w-full text-sm"
                        disabled={refreshing}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPositioner align="start" className="z-50">
                        <SelectPopup className="min-w-48 bg-background-rich">
                          {filter.items.map((item) => (
                            <SelectItem
                              key={item.value}
                              value={item.value}
                              className="text-sm"
                            >
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </SelectPositioner>
                    </Select>
                  </div>
                ))}
                <p className="text-foreground-dimmed text-xs leading-6">
                  {translate("prospect.progress.help")}
                </p>
                {filterCount > 0 && (
                  <Button variant="soft" color="neutral" onClick={clear}>
                    {translate("prospect.list.action.tertiary")}
                  </Button>
                )}
              </PopoverPopup>
            </PopoverPositioner>
          </Popover>
          {activeFilter && (
            <Button variant="soft" color="neutral" onClick={clear}>
              <XIcon aria-hidden />
              {translate("prospect.list.action.tertiary")}
            </Button>
          )}
        </div>
        {manualPreparation !== null && (
          <PreparationBatch target={manualPreparation} />
        )}
      </div>
      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetPopup
          side="right"
          finalFocus={actionsTrigger}
          closeLabel={translate("prospect.list.action.quaternary")}
          className="z-50 h-dvh max-h-dvh w-full max-w-full gap-0 bg-background-rich p-0 transition-transform ease-out data-closed:duration-150 data-open:duration-200 motion-reduce:transition-none motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-starting-style:translate-x-0 sm:w-2xl sm:max-w-2xl"
          classList={{
            backdrop:
              "z-50 bg-emphasis/40 backdrop-blur-sm motion-reduce:transition-none",
          }}
        >
          <div className="border-accent-foreground border-b p-4 pr-12 sm:p-6 sm:pr-12">
            <SheetTitle>{translate("import.title")}</SheetTitle>
            <SheetDescription className="mt-2 leading-6">
              {translate("import.description")}
            </SheetDescription>
          </div>
          <ScrollArea
            className="min-h-0 flex-1"
            viewportProps={{
              role: "region",
              tabIndex: 0,
              "aria-label": translate("import.title"),
            }}
          >
            {importOpen && <ImportForm />}
          </ScrollArea>
        </SheetPopup>
      </Sheet>
      <ProspectTable
        queue={queue}
        pending={refreshing}
        onPageChange={(page) => navigate({ ...currentQuery, page })}
      >
        <Empty
          title={translate(
            activeFilter ? "prospect.searchEmptyTitle" : "prospect.emptyTitle",
          )}
          description={translate(
            activeFilter
              ? "prospect.searchEmptyDescription"
              : "prospect.emptyDescription",
          )}
        >
          {activeFilter && (
            <Button variant="soft" color="neutral" onClick={clear}>
              {translate("prospect.list.action.tertiary")}
            </Button>
          )}
        </Empty>
      </ProspectTable>
    </>
  );
};

export namespace ProspectList {
  export type Props = {
    queue: ProspectPage;
    query: ProspectQuery;
    manualPreparation: number | null;
  };
}
