import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import {
  MarketingBand,
  MarketingClosing,
  MarketingEyebrow,
  MarketingHero,
  MarketingStatus,
} from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Marketing design foundation",
  robots: { index: false, follow: false },
};

export default () => (
  <main className="marketing-site">
    <MarketingHero
      eyebrow="Design foundation"
      title="Commerce infrastructure, in plain sight."
      description="The November 2026 marketing system. Continuous rails, square fields, exact typography and purposeful blue."
      actions={[
        { label: "Primary action", href: "/demo" },
        { label: "Secondary action", href: "/platform" },
      ]}
    />
    <MarketingBand className="marketing-field">
      <div className="marketing-cell">
        <MarketingEyebrow>01 · Structure and type</MarketingEyebrow>
        <h2>One field. A shared set of seams.</h2>
        <p>
          LT Superior Medium headings and Red Hat Display body text. No weight
          above 600.
        </p>
      </div>
      <div className="marketing-grid">
        <article>
          <h3>Live today</h3>
          <p>A direct integration with clear limits.</p>
          <MarketingStatus status="live">Live</MarketingStatus>
        </article>
        <article>
          <h3>From your catalog</h3>
          <p>A read-only feed import.</p>
          <MarketingStatus status="feed">Via product feed</MarketingStatus>
        </article>
        <article>
          <h3>On the build list</h3>
          <p>A stated scope, with no promised date.</p>
          <MarketingStatus status="soon">Coming soon</MarketingStatus>
        </article>
      </div>
    </MarketingBand>
    <MarketingBand>
      <div className="marketing-cell">
        <h2>Controls</h2>
        <div className="marketing-actions">
          <Button variant="flat">Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button disabled variant="flat">
            Disabled
          </Button>
        </div>
      </div>
    </MarketingBand>
    <MarketingClosing
      title="AI is already choosing products in your category."
      description="Find out if it's choosing yours."
      actions={[
        { label: "Book a demo", href: "/demo" },
        { label: "Check my store free", href: "/sign-up" },
      ]}
    />
  </main>
);
