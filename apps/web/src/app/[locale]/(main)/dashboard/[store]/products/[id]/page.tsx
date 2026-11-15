import { connection } from "next/server";
import { Suspense } from "react";
import * as Product from "@/server/app/product";
import { sanitize } from "@/server/utils/blog-content";
import { Environment } from "@/server/utils/environment";
import { ProductDetail } from "./_components/product-detail";
import {
  PageSkeleton,
  ProductFeedback,
  ProductHeader,
  ProductShell,
} from "./_components/shell";

type DetailParams =
  PageProps<"/[locale]/dashboard/[store]/products/[id]">["params"];

const ProductContent = async ({ params }: { params: DetailParams }) => {
  await connection();
  const { id, store } = await params;
  const detail = await Product.getDetail(Environment.SERVER, { id, store });
  if (!detail.success)
    return (
      <ProductFeedback
        kind={
          detail.error.message === "Product not found" ? "missing" : "error"
        }
      />
    );
  if (!detail.data) return <ProductFeedback kind="missing" />;
  const data = {
    ...detail.data,
    product: {
      ...detail.data.product,
      description: detail.data.product.description
        ? sanitize(detail.data.product.description)
        : null,
    },
  };
  return (
    <>
      <ProductHeader data={data} />
      <ProductDetail data={data} />
    </>
  );
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/products/[id]">) => (
  <ProductShell>
    <Suspense fallback={<PageSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  </ProductShell>
);
