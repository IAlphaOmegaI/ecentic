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

      startTransition(() => router.push(`?${parameters.toString()}`));
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
        <button
          type="button"
          aria-label={translate("clear")}
          onClick={handleClear}
          className="shrink-0 cursor-pointer text-foreground-dimmed transition-colors hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
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
    <div className="flex items-center gap-1.5">
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
        <SelectTrigger className="h-8 min-w-0 flex-1 bg-background px-2.5 text-sm">
          {translate(`fields.${condition.field}`)}
        </SelectTrigger>
        <SelectPositioner>
          <SelectPopup>
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
        <SelectTrigger className="h-8 min-w-0 flex-1 bg-background px-2.5 text-sm">
          {translate(`operators.${condition.operator}`)}
        </SelectTrigger>
        <SelectPositioner>
          <SelectPopup>
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
        <TextField
          value={condition.value}
          onValueChange={(value) => onPatch({ value })}
          className="h-8 min-w-0 flex-1 bg-background"
        >
          <TextFieldInput
            placeholder={translate("valuePlaceholder")}
            className="text-sm"
          />
        </TextField>
      )}

      <Button
        size="icon"
        variant="ghost"
        color="accent"
        className="size-8 shrink-0"
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
          <Button variant="outline" color="accent" className="h-10 shrink-0" />
        }
      >
        <FilterIcon className="size-4" />
        {translate("addFilter")}
        {applied.length > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary font-medium text-[10px] text-background-rich">
            {applied.length}
          </span>
        )}
      </PopoverTrigger>

      <PopoverPositioner side="bottom" align="end" sideOffset={8}>
        <PopoverPopup className="w-96 max-w-[calc(100vw-2rem)] bg-background-rich p-0">
          <div className="border-accent-foreground border-b px-3 py-2.5">
            <PopoverTitle className="font-medium text-foreground text-sm">
              {translate("title")}
            </PopoverTitle>
          </div>

          <div className="flex flex-col gap-2 p-3">
            {conditions.map((condition) => (
              <ConditionRow
                key={condition.key}
                condition={condition}
                onPatch={(patch) => patchCondition(condition.key, patch)}
                onRemove={() => removeCondition(condition.key)}
              />
            ))}

            <Button
              variant="ghost"
              color="accent"
              className="h-8 self-start px-2 text-foreground-dimmed"
              onClick={() =>
                setConditions((current) => [...current, blankCondition()])
              }
            >
              <PlusIcon className="size-4" />
              {translate("addCondition")}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 border-accent-foreground border-t px-3 py-2">
            <Button
              variant="ghost"
              color="accent"
              className="h-8"
              onClick={handleClear}
            >
              {translate("clear")}
            </Button>
            <Button color="primary" className="h-8" onClick={handleApply}>
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
    <button
      type="button"
      disabled={active}
      onClick={() => apply([...applied, { field, operator: "isEmpty" }])}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 text-sm text-warning transition-colors hover:bg-warning/10",
        active && "cursor-default opacity-60",
      )}
    >
      <AlertCircleIcon className="size-4" />
      {translate("missing", { count, field: translate(`fields.${field}`) })}
    </button>
  );
};
