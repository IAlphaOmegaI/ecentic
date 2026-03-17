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
  <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-foreground text-xl">
          UCP & Structured Data
        </h1>
        <p className="font-light text-foreground-dimmed text-sm">
          Universal Commerce Protocol — helps AI agents understand your merchant
          identity.
        </p>
      </div>
    </div>
    <Suspense fallback={<Skeleton />}>
      <UcpContent />
    </Suspense>
  </div>
);

const Skeleton = () => (
  <div className="animate-pulse">
    <div className="mb-6 flex justify-end">
      <div className="h-8 w-24 rounded bg-accent-foreground/20" />
    </div>
    <div className="mb-6 flex items-center gap-4 border border-accent-foreground bg-background-rich p-4">
      <div className="size-16 shrink-0 rounded-full bg-accent-foreground/20" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-accent-foreground/20" />
        <div className="h-3 w-full max-w-md bg-accent-foreground/20" />
        <div className="h-3 w-64 bg-accent-foreground/20" />
      </div>
    </div>
    <div className="mb-4 flex gap-4 border-accent-foreground border-b">
      <div className="h-9 w-36 bg-accent-foreground/20" />
      <div className="h-9 w-44 bg-accent-foreground/20" />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4 border border-accent-foreground bg-background-rich p-4">
        <div className="h-4 w-24 bg-accent-foreground/20" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: no better key
            <div key={index} className="h-10 bg-accent-foreground/10" />
          ))}
        </div>
        <div className="flex gap-2 pt-4">
          <div className="h-9 flex-1 bg-accent-foreground/20" />
          <div className="h-9 flex-1 bg-accent-foreground/20" />
        </div>
      </div>
      <div className="h-80 border border-accent-foreground bg-background-rich p-4">
        <div className="mb-2 h-4 w-28 bg-accent-foreground/20" />
        <div className="h-full w-full bg-accent-foreground/10" />
      </div>
    </div>
  </div>
);
