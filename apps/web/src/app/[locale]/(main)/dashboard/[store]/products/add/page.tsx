import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { StatusPillSkeleton } from "../../../_components/chrome-skeletons";
import { StatusPill } from "../../../_components/grid";
import { CatalogFeedback } from "../_components/shell";
import { AddProducts } from "./_components/add-products";
import {
  AddProductsShell,
  BackLinkSkeleton,
  SourcesSkeleton,
} from "./_components/shell";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/products/add">["params"];

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/products/add">) => (
  <AddProductsShell
    statusPill={
      <Suspense fallback={<StatusPillSkeleton />}>
        <CatalogStatus params={params} />
      </Suspense>
    }
    action={
      <Suspense fallback={<BackLinkSkeleton />}>
        <BackToProducts params={params} />
      </Suspense>
    }
  >
    <Suspense fallback={<SourcesSkeleton />}>
      <Sources params={params} />
    </Suspense>
  </AddProductsShell>
);

const CatalogStatus = async ({ params }: { params: StoreParams }) => {
  const locale = await getLocale();

  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.products.add");
  const shared = await getTranslations("dashboard.shared");
  const [resolved, total] = await Promise.all([
    Store.resolveForUser(Environment.SERVER, { store }),
    Product.countForCurrentUser(Environment.SERVER, { store }),
  ]);

  if (!resolved.success || !total.success) return null;
  return (
    <StatusPill tone={resolved.data.lastSyncedAt ? "success" : "neutral"}>
      {`${shared("count.products", { count: total.data })} · `}
      {resolved.data.lastSyncedAt
        ? translate("catalogSynced", {
            time: formatRelativeTime(resolved.data.lastSyncedAt, locale),
          })
        : translate("catalogNeverSynced")}
    </StatusPill>
  );
};

const Sources = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  // The layout already 404s an unowned store, but this component reads the row
  // itself — resolve through the ownership-checked path rather than a bare get.
  const resolved = await Store.resolveForUser(Environment.SERVER, { store });
  if (!resolved.success) {
    if (resolved.error.name === "not-found-error") notFound();
    return <CatalogFeedback kind="error" />;
  }

  return (
    <AddProducts
      store={store}
      platform={resolved.data.platform}
      domain={resolved.data.domain}
    />
  );
};

const BackToProducts = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const translate = await getTranslations("dashboard.products.add");

  return (
    <Button
      variant="soft"
      color="neutral"
      render={<Link href={`/dashboard/${store}/products`} />}
    >
      <ArrowLeftIcon className="size-4" />
      {translate("backToProducts")}
    </Button>
  );
};
