import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import * as Ucp from "@/server/app/intelligence/ucp";
import * as Product from "@/server/app/product";
import { UcpManager } from "./_components/ucp-manager";

const UcpContent = async () => {
  const [profile, products] = await Promise.all([
    unwrapResult(Ucp.getProfile()),
    unwrapResult(Product.getForCurrentUser()),
  ]);

  return <UcpManager profile={profile} products={products} />;
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-x border-accent-foreground">
      {/* Title */}
      <div className="-mx-8 border-b border-accent-foreground">
        <div className="mx-8 px-6 py-8">
          <h1 className="font-medium text-foreground text-3xl">
            UCP & Structured Data
          </h1>
          <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
            Universal Commerce Protocol — your merchant identity for AI shopping
            agents.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="-mx-8 border-b border-accent-foreground">
        <div className="mx-8 p-6">
          <Suspense fallback={<Skeleton />}>
            <UcpContent />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);

const Skeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="border border-accent-foreground bg-background p-5">
      <div className="flex items-center gap-6">
        <div className="size-14 shrink-0 rounded-full bg-accent-foreground/20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-accent-foreground/20" />
          <div className="h-3 w-72 bg-accent-foreground/10" />
        </div>
      </div>
    </div>

    <div className="flex border border-accent-foreground">
      <div className="h-9 w-36 bg-accent-foreground/20" />
      <div className="h-9 w-48 bg-accent-foreground/10" />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="border border-accent-foreground bg-background">
        <div className="border-accent-foreground border-b px-4 py-2.5">
          <div className="h-4 w-24 bg-accent-foreground/20" />
        </div>
        <div className="divide-y divide-accent-foreground">
          {Array.from({ length: 9 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={index} className="flex items-center gap-3 px-4 py-2.5">
              <div className="size-1.5 shrink-0 rounded-full bg-accent-foreground/30" />
              <div className="h-3 w-28 bg-accent-foreground/20" />
              <div className="h-7 flex-1 bg-accent-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-72 border border-accent-foreground bg-background" />
        <div className="h-32 border border-accent-foreground bg-background" />
      </div>
    </div>
  </div>
);
