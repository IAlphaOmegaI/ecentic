import { unwrapResult } from "@zenncore/utils";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import * as Entry from "@/server/app/entry";
import { Environment } from "@/server/utils/environment";
import { EntryImport } from "./_components/entry-import";
import { PlatformGrid } from "./_components/platform-grid";
import { CatalogSkeleton, FooterSkeleton } from "./_components/skeletons";
import { Skip } from "./_components/skip";

// A store typed into the landing hero is imported by an action posted against
// this segment, and a large public catalog takes well past the default
// function window.
export const maxDuration = 300;

const Catalog = async () => {
  const entry = await unwrapResult(Entry.pending(Environment.SERVER));
  if (!entry) return <PlatformGrid />;

  // Keyed by status: when the cookie's outcome changes (this tab or another
  // wrote `claimed`/`locked`), the panel remounts into it instead of keeping a
  // stale local state.
  return (
    <EntryImport key={entry.status} entry={entry}>
      <PlatformGrid />
    </EntryImport>
  );
};

const Footer = async () => {
  const entry = await unwrapResult(Entry.pending(Environment.SERVER));
  return <Skip entry={entry !== null} />;
};

export default async () => {
  const translate = await getTranslations("onboarding.connect");

  return (
    <Motion.Stagger
      stagger={0.08}
      delay={0.1}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <Motion.Item className="relative isolate shrink-0 border-accent-foreground border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/10 to-background-rich [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,16px_100%,0_calc(100%_-_16px))]"
        />
        <div className="flex flex-col gap-3 px-6 py-7 sm:px-8 sm:py-9">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <h1 className="font-heading font-medium text-3xl text-foreground-rich sm:text-4xl">
            {translate("page.title")}
          </h1>
          <p className="max-w-2xl text-base text-foreground-dimmed leading-relaxed">
            {translate("page.description")}
          </p>
        </div>
      </Motion.Item>

      <Motion.Item className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative min-h-full">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<CatalogSkeleton />}>
            <Catalog />
          </Suspense>
        </div>
      </Motion.Item>

      <Motion.Item className="relative shrink-0 border-accent-foreground border-t">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<FooterSkeleton />}>
            <Footer />
          </Suspense>
          <p className="text-foreground-dimmed text-sm">
            {translate("footer.settingsHint")}
          </p>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};
