"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  type ColumnDef,
  DataTable,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { ListingReport } from "@/server/app/intelligence/listing-quality";

export const ProductIdentity = ({
  product,
  store,
}: {
  product: Pick<ListingReport, "id" | "title" | "image">;
  store?: string;
}) => {
  const locale = useLocale();
  const title = product.title.trim() || product.id;
  const identity = (
    <>
      <Avatar className="size-10 shrink-0 rounded-lg border border-accent-foreground bg-background">
        <AvatarImage src={product.image ?? undefined} alt="" />
        <AvatarFallback className="font-semibold text-foreground-dimmed text-sm">
          {title.slice(0, 2).toLocaleUpperCase(locale)}
        </AvatarFallback>
      </Avatar>
      <span
        className="min-w-0 flex-1 truncate font-semibold text-foreground-rich text-sm"
        title={title}
      >
        {title}
      </span>
    </>
  );
  return store ? (
    <Link
      href={`/dashboard/${store}/products/${product.id}`}
      className="flex min-w-0 items-center gap-4 rounded-sm hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      {identity}
    </Link>
  ) : (
    <span className="flex min-w-0 items-center gap-4">{identity}</span>
  );
};

export const AffectedProducts = ({
  products,
  store,
}: {
  products: ListingReport[];
  store: string;
}) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  const [limit, setLimit] = useState(6);
  const rows = products
    .slice(0, limit)
    .map((product) => ({ ...product, _id: product.id }));
  const columns: ColumnDef<(typeof rows)[number]>[] = [
    {
      id: "product",
      header: translate("product"),
      cell: ({ row }) => (
        <ProductIdentity product={row.original} store={store} />
      ),
    },
    {
      id: "open",
      meta: { className: "w-16" },
      header: () => (
        <span className="sr-only">{translate("productAction.primary")}</span>
      ),
      cell: ({ row }) => (
        <Button
          variant="ghost"
          color="neutral"
          size="icon"
          render={
            <Link href={`/dashboard/${store}/products/${row.original.id}`} />
          }
          aria-label={translate("openProduct", {
            product: row.original.title.trim() || row.original.id,
          })}
        >
          <ArrowRightIcon className="size-4" />
        </Button>
      ),
    },
  ];
  return (
    <div className="min-w-0 border-accent-foreground border-t bg-background-rich">
      <DataTableProvider
        rows={rows}
        columns={columns}
        pageSize={Math.max(1, products.length)}
      >
        <DataTable
          className="table-fixed border-b-0"
          classList={{
            "header-cell":
              "bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal sm:px-6",
            "body-cell": "px-4 py-2 font-normal sm:px-6",
            "body-row": "last:border-b-0",
          }}
        />
      </DataTableProvider>
      {products.length > limit && (
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
    </div>
  );
};
