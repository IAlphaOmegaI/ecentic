import { ArrowRightIcon, PlusIcon } from "@zenncore/icons";
import { parseSearchParam } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { SearchParamsProps } from "@zenncore/web/types";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { QueryTransitionProvider } from "@/components/query-transition";
import { Link } from "@/i18n/navigation";
import { MISSING_FIELD_CHIPS, parseProductFilters } from "@/lib/filters";
import { normalizeProductSort } from "@/lib/products-catalog";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { extractPaginationParams, type Pager } from "@/server/utils/pagination";
import { CatalogTable } from "../_components/catalog-table";
import { MissingFieldChip } from "../_components/products-filters";
import {
  AddActionSkeleton,
  CatalogFeedback,
  CatalogSummary,
  ProductsShell,
  StatsSkeleton,
  TableSkeleton,
} from "../_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/products">["params"];
type CatalogSearch = SearchParamsProps<
  keyof Pager | "filters" | "search" | "sort" | "direction"
>["searchParams"];

export default ({
  params,
  searchParams,
}: {
  params: StoreParams;
  searchParams: CatalogSearch;
}) => (
  <ProductsShell
    action={
      <Suspense fallback={<AddActionSkeleton />}>
        <AddProductsAction params={params} />
      </Suspense>
    }
    banner={
      <Suspense>
        <EmbedBanner params={params} />
      </Suspense>
    }
    stats={
      <Suspense fallback={<StatsSkeleton />}>
        <Summary params={params} />
      </Suspense>
    }
    table={
      <QueryTransitionProvider>
        <Suspense fallback={<TableSkeleton />}>
          <Products params={params} searchParams={searchParams} />
        </Suspense>
      </QueryTransitionProvider>
    }
  />
);

const Summary = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const catalog = await Product.gatherIntelligence(Environment.SERVER, {
    store,
  });
  if (!catalog.success) {
    const translate = await getTranslations("dashboard.products.catalog");
    return (
      <p className="px-6 py-5 text-foreground-dimmed text-sm">
        {translate("summary.unavailable")}
      </p>
    );
  }
  return (
    <CatalogSummary
      total={catalog.data.products.length}
      compared={
        catalog.data.products.filter((product) => product.simulations > 0)
          .length
      }
      incomplete={
        catalog.data.products.filter((product) => product.quality < 100).length
      }
    />
  );
};

const Products = async ({
  params,
  searchParams,
}: {
  params: StoreParams;
  searchParams: CatalogSearch;
}) => {
  await connection();
  const { store } = await params;
  const query = await searchParams;
  const { page, size } = await extractPaginationParams(searchParams);
  const search =
    parseSearchParam(query.search, "single", "").trim() || undefined;
  const filters = parseProductFilters(
    parseSearchParam(query.filters, "single", "") || undefined,
  );
  const sort = normalizeProductSort({
    field: parseSearchParam(query.sort, "single", "updatedAt"),
    direction: parseSearchParam(query.direction, "single", "desc"),
  });
  const catalog = await Product.paginateWithIntelligence(Environment.SERVER, {
    page,
    size,
    store,
    search,
    filters,
    sort,
  });
  if (!catalog.success) return <CatalogFeedback kind="error" />;
  const { items, pagination } = catalog.data;
  return (
    <CatalogTable
      rows={items}
      store={store}
      sort={sort}
      filtered={Boolean(search) || filters.length > 0}
      total={pagination.total}
      pageCount={Math.max(1, Math.ceil(pagination.total / pagination.size))}
      pageSize={pagination.size}
      pageIndex={pagination.page}
      missingFields={
        <Suspense>
          <MissingFields params={params} />
        </Suspense>
      }
    />
  );
};

const MissingFields = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const fields = await Product.countMissingFields(Environment.SERVER, {
    store,
  });
  if (!fields.success) return null;
  const missing = MISSING_FIELD_CHIPS.filter((field) => fields.data[field] > 0);
  if (!missing.length) return null;
  return (
    <div className="flex flex-wrap gap-2 border-accent-foreground border-b px-4 py-3 sm:px-6">
      {missing.map((field) => (
        <MissingFieldChip
          key={field}
          field={field}
          count={fields.data[field]}
        />
      ))}
    </div>
  );
};

const AddProductsAction = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const translate = await getTranslations("dashboard.products.catalog");
  return (
    <Button
      color="primary"
      render={<Link href={`/dashboard/${store}/products/add`} />}
    >
      <PlusIcon className="size-4" />
      {translate("action.add")}
    </Button>
  );
};

const EmbedBanner = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.products.embedBanner");
  const embed = await Product.getStoreEmbedStatus(Environment.SERVER, {
    store,
  });
  if (!embed.success || !embed.data.embedOff || !embed.data.themeEditorUrl)
    return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t bg-warning/5 px-4 py-4 sm:px-6">
      <div>
        <p className="font-semibold text-foreground-rich text-sm">
          {translate("title")}
        </p>
        <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm leading-6">
          {translate("description")}
        </p>
      </div>
      <Button
        variant="soft"
        color="neutral"
        render={
          <a
            href={embed.data.themeEditorUrl}
            target="_blank"
            rel="noreferrer"
          />
        }
      >
        {translate("action")}
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  );
};
