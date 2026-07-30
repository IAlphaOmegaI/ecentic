import { Crosshair, SectionGutter } from "../../_components/grid";
import { AuditSkeleton } from "./_components/skeletons";

// Mirrors the visibility page shell so navigation lands without layout shift.
export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 px-6 py-8">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.14em]">
            Agent Visibility
          </p>
          <h1 className="mt-2 font-bold text-2xl text-foreground-rich">
            Where AI shopping agents actually see this store
          </h1>
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
            Readiness checks run against the real ingestion surfaces —
            robots.txt, rendered storefront HTML, offer identity, and feeds —
            and live rank measurement in the Shopify Global Catalog that
            ChatGPT, Perplexity, and Copilot query.
          </p>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <AuditSkeleton />
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
              Live shelf position
            </p>
            <p className="mt-1 font-medium text-base text-foreground">
              Rank this store in the Global Catalog for a buyer query
            </p>
          </div>
          <AuditSkeleton />
        </div>
      </div>
    </div>
  </div>
);
