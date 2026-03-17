import { ChevronLeftIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import Link from "next/link";
import { Suspense } from "react";

import * as Product from "@/server/app/product";
import { ProductDetail } from "./_components/product-detail";

export default ({ params }: PageProps<"/dashboard/products/[id]">) => (
  <div className="p-6">
    <div className="mb-4">
      <Link
        href="/dashboard/products"
        className="flex items-center gap-1 font-light text-foreground-dimmed text-sm hover:text-primary"
      >
        <ChevronLeftIcon className="size-4" />
        Back to Products
      </Link>
    </div>

    <Suspense fallback={<DetailSkeleton />}>
      <ProductDetailContent params={params} />
    </Suspense>
  </div>
);

const ProductDetailContent = async ({
  params,
}: Pick<PageProps<"/dashboard/products/[id]">, "params">) => {
  const { id } = await params;
  const data = await unwrapResult(Product.getDetail({ id }));
  if (!data) return null;

  return <ProductDetail data={data} />;
};

const DetailSkeleton = () => (
  <>
    <div className="mb-6 flex items-start gap-4">
      <div className="size-16 animate-pulse bg-foreground/10" />
      <div className="flex-1 space-y-2">
        <div className="h-6 w-48 animate-pulse bg-foreground/10" />
        <div className="h-4 w-32 animate-pulse bg-foreground/10" />
        <div className="h-8 w-20 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="mb-4 h-10 w-full animate-pulse bg-foreground/10" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: no better key
          key={index}
          className="border border-accent-foreground bg-background-rich p-4"
        >
          <div className="h-4 w-16 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-8 w-20 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-1.5 w-full animate-pulse bg-foreground/10" />
          <div className="mt-1 h-3 w-32 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  </>
);
