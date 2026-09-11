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
      className="flex flex-1 flex-col overflow-hidden"
    >
      <Motion.Item className="w-full border-accent-foreground border-b px-8">
        <div className="relative flex flex-col border-accent-foreground border-x p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <h2 className="font-medium text-4xl text-foreground">
            {translate("page.title")}
          </h2>
          <p className="font-light text-2xl text-foreground-dimmed">
            {translate("page.description")}
          </p>
        </div>
      </Motion.Item>

      <Motion.Item className="min-h-0 w-full flex-1 overflow-y-auto border-accent-foreground border-b px-8">
        <div className="relative h-full border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<CatalogSkeleton />}>
            <Catalog />
          </Suspense>
        </div>
      </Motion.Item>

      <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
        <div className="relative flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<FooterSkeleton />}>
            <Footer />
          </Suspense>
          <p className="font-light text-foreground-dimmed text-sm">
            {translate("footer.settingsHint")}
          </p>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};
