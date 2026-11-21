"use client";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  LoaderIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from "@zenncore/icons";
import { Avatar, AvatarFallback } from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@zenncore/web/components/dialog";
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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { PROSPECT_LIFECYCLES } from "@/lib/outbound-prospect-progress";
import {
  type ProspectList as ProspectPage,
  type ProspectQuery,
  parseProspectQuery,
  prospectsHref,
} from "@/lib/outbound-prospects";
import { sentHref } from "@/lib/outbound-sent";
import { LINKEDIN_STATUSES, PROSPECT_STATUSES } from "@/lib/outbound-status";
import { Empty, Status } from "./status";

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
}: {
  queue: ProspectPage;
  query: ProspectQuery;
  manualPreparation: number | null;
}) => {
  const t = useTranslations("outbound");
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
  const navigate = useCallback(
    (next: ProspectQuery, replace = false) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      const normalized = parseProspectQuery(next);
      const href = prospectsHref(normalized);
      const pendingHref = pendingQuery.current
        ? prospectsHref(pendingQuery.current)
        : null;
      if (href === pendingHref || (href === currentHref && !pendingHref))
        return;
      pendingQuery.current = normalized;
      startRefresh(() =>
        replace
          ? router.replace(href, { scroll: false })
          : router.push(href, { scroll: false }),
      );
    },
    [currentHref, router],
  );
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
  const { rows, total, pageSize } = queue;
  const currentPage = queue.page - 1;
  const activeFilter = Boolean(search) || filterCount > 0;
  const statusItems = [
    { value: "all", label: t("prospect.list.allStatuses") },
    ...PROSPECT_STATUSES.map((value) => ({
      value,
      label: t(`status.${value}`),
    })),
  ];
  const lifecycleItems = [
    { value: "all", label: t("prospect.progress.allLifecycle") },
    ...PROSPECT_LIFECYCLES.map((value) => ({
      value,
      label: t(`prospect.progress.lifecycle.${value}`),
    })),
  ];
  const linkedinItems = [
    { value: "all", label: t("prospect.progress.allLinkedin") },
    ...LINKEDIN_STATUSES.map((value) => ({
      value,
      label: t(`linkedin.status.${value}`),
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
                {t("prospect.list.toolbar.refreshing")}
              </>
            ) : (
              t("prospect.list.count", { count: total })
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/prospects/new" />}>
              <PlusIcon aria-hidden className="size-4" />
              {t("prospect.newTitle")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                ref={actionsTrigger}
                render={<Button variant="soft" color="neutral" />}
              >
                {t("prospect.list.toolbar.more")}
                <ChevronDownIcon aria-hidden className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <UploadIcon aria-hidden className="size-4" />
                  {t("import.action.primary")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={refreshing}
                  onClick={() => startRefresh(() => router.refresh())}
                >
                  {t("prospect.progress.action.primary")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/sent" />}>
                  {t("nav.sent")}
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/campaigns" />}>
                  {t("prospect.progress.action.tertiary")}
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
                aria-label={t("prospect.search")}
                placeholder={t("prospect.search")}
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
              <FilterIcon aria-hidden className="size-4" />
              {t("prospect.list.toolbar.filters")}
              {filterCount > 0 && (
                <span className="tabular-nums">({filterCount})</span>
              )}
            </PopoverTrigger>
            <PopoverPositioner align="end" className="z-40">
              <PopoverPopup className="w-80 max-w-[calc(100vw-2rem)] space-y-4 bg-background-rich p-4 motion-reduce:transition-none">
                <PopoverTitle>
                  {t("prospect.list.toolbar.filters")}
                </PopoverTitle>
                {[
                  {
                    key: "status",
                    value: status,

                    items: statusItems,
                    label: t("prospect.list.toolbar.pipelineStatus"),
                  },
                  {
                    key: "lifecycle",
                    value: lifecycle,

                    items: lifecycleItems,
                    label: t("prospect.progress.lifecycleFilter"),
                  },
                  {
                    key: "linkedin",
                    value: linkedin,

                    items: linkedinItems,
                    label: t("prospect.progress.linkedinFilter"),
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
                <p className="text-foreground-dimmed text-xs leading-5">
                  {t("prospect.progress.help")}
                </p>
                {filterCount > 0 && (
                  <Button variant="soft" color="neutral" onClick={clear}>
                    {t("prospect.list.action.tertiary")}
                  </Button>
                )}
              </PopoverPopup>
            </PopoverPositioner>
          </Popover>
          {activeFilter && (
            <Button variant="soft" color="neutral" onClick={clear}>
              <XIcon aria-hidden className="size-4" />
              {t("prospect.list.action.tertiary")}
            </Button>
          )}
        </div>
        {manualPreparation !== null && (
          <PreparationBatch target={manualPreparation} />
        )}
      </div>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogPopup
          finalFocus={actionsTrigger}
          className="z-50 mt-0 max-h-[85dvh] w-2xl overflow-y-auto bg-background-rich p-0"
          classList={{ backdrop: "z-50" }}
        >
          <div className="flex items-start gap-4 border-accent-foreground border-b p-6">
            <div className="min-w-0 flex-1">
              <DialogTitle className="m-0 font-semibold text-xl">
                {t("import.title")}
              </DialogTitle>
              <DialogDescription className="mt-2 mb-0 text-sm leading-6">
                {t("import.description")}
              </DialogDescription>
            </div>
            <DialogClose
              render={<Button variant="ghost" color="neutral" size="icon" />}
              aria-label={t("prospect.list.action.quaternary")}
            >
              <XIcon aria-hidden className="size-4" />
            </DialogClose>
          </div>
          {importOpen && <ImportForm />}
        </DialogPopup>
      </Dialog>
      {rows.length ? (
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-240 table-fixed border-b-0 [&_td]:font-normal">
            <TableHeader>
              <TableRow>
                {[
                  { key: "company", label: t("prospect.fields.company") },
                  { key: "name", label: t("prospect.fields.name") },
                  { key: "email", label: t("prospect.fields.email") },
                  {
                    key: "review",
                    label: t("prospect.progress.emailProgress"),
                  },
                  { key: "linkedin", label: t("nav.linkedin") },
                  { key: "sent", label: t("nav.sent") },
                ].map(({ key, label }) => (
                  <TableHead
                    key={key}
                    className="h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal sm:px-6"
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((prospect) => (
                <TableRow
                  key={prospect.id}
                  className="group hover:bg-background/70"
                >
                  <TableCell className="px-4 py-3 sm:px-6">
                    <Link
                      href={`/prospects/${prospect.id}`}
                      prefetch={false}
                      className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <Avatar className="size-9 shrink-0 rounded-lg border border-accent-foreground bg-background text-foreground-dimmed">
                        <AvatarFallback className="text-sm">
                          {prospect.company.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground-rich group-hover:text-primary-text">
                          {prospect.company}
                        </span>
                        <span className="mt-0.5 block truncate text-foreground-dimmed text-xs">
                          {prospect.domain}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <p className="truncate text-sm">{prospect.name}</p>
                    <p className="mt-0.5 truncate text-foreground-dimmed text-xs">
                      {prospect.title}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <p className="truncate text-foreground-dimmed text-sm">
                      {prospect.email || t("common.emptyValue")}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <Status value={prospect.status} />
                        {prospect.lifecycles
                          .filter(
                            (value) => !["replied", "held"].includes(value),
                          )
                          .map((value) => (
                            <p
                              key={value}
                              className="text-foreground-dimmed text-xs"
                            >
                              {t(`prospect.progress.lifecycle.${value}`)}
                            </p>
                          ))}
                      </div>
                      <Link
                        href={`/prospects/${prospect.id}`}
                        prefetch={false}
                        aria-label={`${t("prospect.editTitle")}: ${prospect.company}`}
                        className="shrink-0 rounded-sm p-1 text-foreground-dimmed hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <ArrowRightIcon aria-hidden className="size-4" />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    {prospect.linkedinUrl ? (
                      <span className="text-sm">
                        {t(`linkedin.status.${prospect.linkedinStatus}`)}
                      </span>
                    ) : (
                      t("common.emptyValue")
                    )}
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <Button
                      variant="soft"
                      color="neutral"
                      render={
                        <Link
                          href={sentHref({ prospect: prospect.id })}
                          prefetch={false}
                        />
                      }
                    >
                      {t("prospect.progress.action.secondary")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty
          title={t(
            activeFilter ? "prospect.searchEmptyTitle" : "prospect.emptyTitle",
          )}
          description={t(
            activeFilter
              ? "prospect.searchEmptyDescription"
              : "prospect.emptyDescription",
          )}
        >
          {activeFilter && (
            <Button variant="soft" color="neutral" onClick={clear}>
              {t("prospect.list.action.tertiary")}
            </Button>
          )}
        </Empty>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-3 sm:px-6">
        <p
          aria-live="polite"
          className="text-foreground-dimmed text-xs tabular-nums"
        >
          {t("prospect.list.range", {
            start: total ? currentPage * pageSize + 1 : 0,
            end: Math.min((currentPage + 1) * pageSize, total),
            total: total,
          })}
        </p>
        <nav
          aria-label={t("prospect.list.pagination")}
          className="flex items-center gap-2"
        >
          <Button
            variant="soft"
            color="neutral"
            size="icon"
            disabled={refreshing || currentPage === 0}
            aria-label={t("prospect.list.action.primary")}
            onClick={() => navigate({ ...currentQuery, page: queue.page - 1 })}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
          </Button>
          <Button
            variant="soft"
            color="neutral"
            size="icon"
            disabled={refreshing || (currentPage + 1) * pageSize >= total}
            aria-label={t("prospect.list.action.secondary")}
            onClick={() => navigate({ ...currentQuery, page: queue.page + 1 })}
          >
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </nav>
      </div>
    </>
  );
};
