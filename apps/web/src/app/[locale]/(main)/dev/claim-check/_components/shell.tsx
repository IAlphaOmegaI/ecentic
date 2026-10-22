import type { ReactNode } from "react";
import { PageHeader } from "../../../dashboard/_components/grid";

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx` so
 * navigation lands without layout shift. Hardcoded English, like every
 * internal `/dev` page; the report below it is the dashboard's own, in the
 * viewer's locale.
 */
export const DemoShell = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <PageHeader
        context="Internal · Live demo"
        title="Claim check"
        description="Paste any public Shopify or WooCommerce product page and run the real claim check on it — no store connection, nothing saved. Each run makes live model calls, so run it when you're ready to show it."
      />
      {children}
    </div>
  </div>
);
