"use client";

import {
  AlertCircleIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
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
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryTransition } from "@/components/query-transition";
import {
  isProductFilterField,
  type MissingProductField,
  operatorNeedsValue,
  operatorsForField,
  PRODUCT_FILTER_FIELDS,
  type ProductFilter,
  type ProductFilterField,
  type ProductFilterOperator,
  parseProductFilters,
  sanitizeProductFilters,
  serializeProductFilters,
} from "@/lib/filters";

const FIELDS = Object.keys(PRODUCT_FILTER_FIELDS) as ProductFilterField[];

const useAppliedFilters = () => {
  const searchParams = useSearchParams();

  return parseProductFilters(searchParams.get("filters") ?? undefined);
};

const useApplyFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startTransition } = useQueryTransition();

  return useCallback(
    (filters: ProductFilter[]) => {
      const parameters = new URLSearchParams(searchParams);
      const serialized = serializeProductFilters(filters);

      if (serialized) parameters.set("filters", serialized);
      else parameters.delete("filters");
      // A different filter set has different page bounds — restart at page 1.
      parameters.delete("page");

      startTransition(() =>
        router.push(`?${parameters.toString()}`, { scroll: false }),
      );
    },
    [router, searchParams, startTransition],
  );
};

export const ProductsSearch = () => {
  const translate = useTranslations("dashboard.products.table.search");
  const router = useRouter();
  const searchParams = useSearchParams();
  const applied = searchParams.get("search") ?? "";

  const [value, setValue] = useState(applied);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The last term this input wrote to the URL, to tell the echo of our own
  // apply apart from an external change (back/forward, a cleared param).
  const lastApplied = useRef<string | null>(null);

  // External URL changes reset the input and cancel any pending apply, so an
  // abandoned draft is never re-applied over a navigation. The echo marker is
  // consumed on match, so forward-navigating back to the same term still
  // counts as external and restores the input.
  useEffect(() => {
    if (applied === lastApplied.current) {
      lastApplied.current = null;
      return;
    }

    clearTimeout(timeout.current);
    setValue(applied);
  }, [applied]);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const { startTransition } = useQueryTransition();

  const applySearch = useCallback(
    (search: string) => {
      lastApplied.current = search;

      // Read the live URL instead of a render-time snapshot, so a filter
      // applied while the debounce was pending is not overwritten.
      const parameters = new URLSearchParams(window.location.search);

      if (search) parameters.set("search", search);
      else parameters.delete("search");
      // A different search has different page bounds — restart at page 1.
      parameters.delete("page");

      startTransition(() =>
        router.replace(`?${parameters.toString()}`, { scroll: false }),
      );
    },
    [router, startTransition],
  );

  const handleValueChange = (next: string) => {
    setValue(next);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => applySearch(next.trim()), 400);
  };

  const handleClear = () => {
    setValue("");
    clearTimeout(timeout.current);
    applySearch("");
  };

  return (
    <TextField
      value={value}
      onValueChange={handleValueChange}
      className="h-10 w-0 min-w-0 flex-1 bg-background"
    >
      <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
      <TextFieldInput
        placeholder={translate("placeholder")}
        aria-label={translate("placeholder")}
        maxLength={200}
        className="text-sm placeholder:text-foreground-dimmed/70"
      />
      {value && (
        <Button
          type="button"
          size="icon"
          color="neutral"
          variant="ghost"
          aria-label={translate("clear")}
          onClick={handleClear}
          className="size-7 shrink-0 text-foreground-dimmed"
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </TextField>
  );
};

type Condition = {
  key: string;
  field: ProductFilterField;
  operator: ProductFilterOperator;
  value: string;
};

const blankCondition = (): Condition => ({
  key: crypto.randomUUID(),
  field: "title",
  operator: "contains",
  value: "",
});

const ConditionRow = ({
  condition,
  onPatch,
  onRemove,
}: {
  condition: Condition;
  onPatch: (patch: Partial<Condition>) => void;
  onRemove: () => void;
}) => {
  const translate = useTranslations("dashboard.products.table.filters");
  const operators = operatorsForField(condition.field);

  return (
    <div className="flex min-w-0 items-start gap-2 border-background-rich/15 border-b py-4 first:pt-0 last:border-b-0">
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
        <Select
          value={condition.field}
          onValueChange={(field: string | null) => {
            if (!isProductFilterField(field)) return;

            const valid = operatorsForField(field);
            onPatch({
              field,
              operator: valid.includes(condition.operator)
                ? condition.operator
                : valid[0],
            });
          }}
        >
          <SelectTrigger
            className="h-10 min-w-0 gap-2 border-transparent bg-background-rich px-4 text-foreground-rich text-sm hover:bg-background active:bg-background data-popup-open:bg-background"
            classList={{
              icon: { icon: "size-4 shrink-0 stroke-foreground-dimmed" },
            }}
          >
            <span className="truncate">
              {translate(`fields.${condition.field}`)}
            </span>
          </SelectTrigger>
          <SelectPositioner alignItemWithTrigger={false}>
            <SelectPopup className="bg-background-rich shadow-sm">
              {FIELDS.map((field) => (
                <SelectItem
                  key={field}
                  value={field}
                  label={translate(`fields.${field}`)}
                >
                  {translate(`fields.${field}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>

        <Select
          value={condition.operator}
          onValueChange={(operator: string | null) => {
            if (!operator) return;
            if (!(operators as readonly string[]).includes(operator)) return;
            onPatch({ operator: operator as ProductFilterOperator });
          }}
        >
          <SelectTrigger
            className="h-10 min-w-0 gap-2 border-transparent bg-background-rich px-4 text-foreground-rich text-sm hover:bg-background active:bg-background data-popup-open:bg-background"
            classList={{
              icon: { icon: "size-4 shrink-0 stroke-foreground-dimmed" },
            }}
          >
            <span className="truncate">
              {translate(`operators.${condition.operator}`)}
            </span>
          </SelectTrigger>
          <SelectPositioner alignItemWithTrigger={false}>
            <SelectPopup className="bg-background-rich shadow-sm">
              {operators.map((operator) => (
                <SelectItem
                  key={operator}
                  value={operator}
                  label={translate(`operators.${operator}`)}
                >
                  {translate(`operators.${operator}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>

        {operatorNeedsValue(condition.operator) && (
          <div className="col-span-2 flex min-w-0 items-center gap-2">
            <TextField
              value={condition.value}
              onValueChange={(value) => onPatch({ value })}
              className="h-10 min-w-0 flex-1 border-transparent bg-background-rich text-foreground-rich"
            >
              <TextFieldInput
                placeholder={translate("valuePlaceholder")}
                aria-label={`${translate(`fields.${condition.field}`)}: ${translate("valuePlaceholder")}`}
                className="text-foreground-rich text-sm placeholder:text-foreground-dimmed"
              />
            </TextField>
          </div>
        )}
      </div>
      <Button
        size="icon"
        variant="soft"
        color="neutral"
        className="mt-1 shrink-0 bg-background-rich/10 text-background-rich/80 hover:bg-background-rich/20 hover:text-background-rich"
        onClick={onRemove}
        aria-label={translate("removeCondition")}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );
};

export const ProductsFilters = () => {
  const translate = useTranslations("dashboard.products.table.filters");
  const applied = useAppliedFilters();
  const apply = useApplyFilters();
  const [open, setOpen] = useState(false);
  const [conditions, setConditions] = useState<Condition[]>([blankCondition()]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;

    // Rebuild the draft from the URL on every open, so the popover always
    // shows what is actually applied — not a stale draft from a previous edit.
    setConditions(
      applied.length > 0
        ? applied.map((filter) => ({
            key: crypto.randomUUID(),
            field: filter.field,
            operator: filter.operator,
            value: filter.value ?? "",
          }))
        : [blankCondition()],
    );
  };

  const patchCondition = (key: string, patch: Partial<Condition>) =>
    setConditions((current) =>
      current.map((condition) =>
        condition.key === key ? { ...condition, ...patch } : condition,
      ),
    );

  const removeCondition = (key: string) =>
    setConditions((current) => {
      const remaining = current.filter((condition) => condition.key !== key);
      return remaining.length > 0 ? remaining : [blankCondition()];
    });

  const handleApply = () => {
    apply(
      sanitizeProductFilters(
        conditions.map((condition) => ({
          field: condition.field,
          operator: condition.operator,
          value: condition.value.trim(),
        })),
      ),
    );
    setOpen(false);
  };

  const handleClear = () => {
    setConditions([blankCondition()]);
    if (applied.length > 0) apply([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="soft" color="accent" className="h-10 shrink-0" />
        }
      >
        <FilterIcon className="size-4" />
        {translate("addFilter")}
        {applied.length > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary font-medium text-background-rich text-xs">
            {applied.length}
          </span>
        )}
      </PopoverTrigger>

      <PopoverPositioner side="bottom" align="end" sideOffset={8}>
        <PopoverPopup className="w-128 max-w-(--available-width) border-background-rich/15 bg-foreground-rich p-0 text-background-rich shadow-sm">
          <div className="flex items-center gap-2 border-background-rich/15 border-b px-4 py-4">
            <FilterIcon className="size-4 shrink-0 text-background-rich/80" />
            <PopoverTitle className="font-heading font-medium text-background-rich text-base">
              {translate("title")}
            </PopoverTitle>
          </div>

          <div className="flex max-h-96 min-w-0 flex-col overflow-y-auto px-4 py-4">
            {conditions.map((condition) => (
              <ConditionRow
                key={condition.key}
                condition={condition}
                onPatch={(patch) => patchCondition(condition.key, patch)}
                onRemove={() => removeCondition(condition.key)}
              />
            ))}

            <Button
              variant="soft"
              color="neutral"
              className="mt-2 self-start bg-background-rich/10 text-background-rich/80 hover:bg-background-rich/20 hover:text-background-rich"
              onClick={() =>
                setConditions((current) => [...current, blankCondition()])
              }
            >
              <PlusIcon className="size-4" />
              {translate("addCondition")}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 border-background-rich/15 border-t px-4 py-4">
            <Button
              variant="soft"
              color="neutral"
              className="bg-background-rich/10 text-background-rich/80 hover:bg-background-rich/20 hover:text-background-rich"
              onClick={handleClear}
            >
              {translate("clear")}
            </Button>
            <Button color="primary" onClick={handleApply}>
              {translate("apply")}
            </Button>
          </div>
        </PopoverPopup>
      </PopoverPositioner>
    </Popover>
  );
};

export const MissingFieldChip = ({
  field,
  count,
}: {
  field: MissingProductField;
  count: number;
}) => {
  const translate = useTranslations("dashboard.products.table.filters");
  const applied = useAppliedFilters();
  const apply = useApplyFilters();

  const active = applied.some(
    (filter) => filter.field === field && filter.operator === "isEmpty",
  );

  return (
    <Button
      type="button"
      variant="soft"
      color="neutral"
      aria-pressed={active}
      onClick={() =>
        apply(
          active
            ? applied.filter(
                (filter) =>
                  !(filter.field === field && filter.operator === "isEmpty"),
              )
            : [...applied, { field, operator: "isEmpty" }],
        )
      }
      className={cn(
        "h-auto min-h-8 max-w-full gap-2 rounded-lg px-3 py-1.5 text-left text-xs",
        active && "border-primary-text/30 bg-primary/5 text-primary-text",
      )}
    >
      <AlertCircleIcon className="size-4" />
      {translate("missing", { count, field: translate(`fields.${field}`) })}
    </Button>
  );
};
