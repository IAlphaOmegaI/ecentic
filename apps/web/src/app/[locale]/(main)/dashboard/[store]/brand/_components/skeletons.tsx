"use client";

import { useTranslations } from "next-intl";

export const BrandSkeleton = () => {
  const translate = useTranslations("dashboard.brand.design");
  return (
    <div role="status" aria-label={translate("loading")}>
      <span className="sr-only">{translate("loading")}</span>
      <div aria-hidden className="motion-reduce:[&_*]:animate-none">
        <div className="flex h-16 items-center gap-4 border-accent-foreground border-b px-6">
          <div className="h-4 w-48 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="grid min-w-0 lg:grid-cols-2">
          <div className="space-y-5 px-6 py-7">
            <div className="h-5 w-32 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
            {["one", "two", "three", "four"].map((key) => (
              <div
                key={key}
                className="h-4 w-full animate-pulse rounded-sm bg-foreground/10 last:w-2/3 motion-reduce:animate-none"
              />
            ))}
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          </div>
          <div className="border-accent-foreground border-t bg-background-rich lg:border-t-0 lg:border-l">
            <div className="px-6 pt-7">
              <div className="h-6 w-56 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
            </div>
            {["unprompted", "named"].map((key) => (
              <div
                key={key}
                className="flex min-h-36 flex-col gap-5 border-accent-foreground not-last:border-b px-6 py-6"
              >
                <div className="flex items-center justify-between gap-5">
                  <div className="h-4 w-40 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
                  <div className="h-10 w-20 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
                </div>
                <div className="h-3 w-40 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
                <div className="h-3 w-24 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>
        <div className="border-accent-foreground border-y px-6 py-4">
          <div className="h-9 w-72 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="grid md:grid-cols-2">
          <div>
            <div className="border-accent-foreground border-b bg-primary/5 px-6 py-5">
              <div className="h-8 w-48 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
            </div>
            <div className="space-y-6 px-6 py-7">
              {["first", "second", "third"].map((key) => (
                <div
                  key={key}
                  className="h-5 w-full animate-pulse rounded-sm bg-foreground/10 last:w-2/3 motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
          <div className="border-accent-foreground border-t md:border-t-0 md:border-l">
            {["one", "two", "three", "four"].map((key) => (
              <div
                key={key}
                className="flex h-24 items-center border-accent-foreground border-b px-6 last:border-b-0"
              >
                <div className="h-5 w-3/4 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
