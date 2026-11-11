import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { fonts } from "@/components/marketing/fonts";
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
  <main
    className={cn(
      fonts,
      "marketing-grid-pattern marketing-site text-(length:--text-base) bg-background font-body text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-md [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-md [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-xs [&_:where(input,textarea,select,[role=combobox])]:rounded-xs [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]",
    )}
  >
    <MarketingHero
      eyebrow="Design foundation"
      title="Commerce infrastructure, in plain sight."
      description="The November 2026 marketing system. Continuous rails, square fields, exact typography and purposeful blue."
      actions={[
        { label: "Primary action", href: "/demo" },
        { label: "Secondary action", href: "/platform" },
      ]}
    />
    <MarketingBand className="marketing-field bg-background [&>.marketing-rail]:bg-background-dimmed [&_.marketing-note]:text-foreground">
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <MarketingEyebrow>01 · Structure and type</MarketingEyebrow>
        <h2>One field. A shared set of seams.</h2>
        <p>
          LT Superior Medium headings and Red Hat Display body text. No weight
          above 600.
        </p>
      </div>
      <div className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
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
      <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        <h2>Controls</h2>
        <div className="marketing-actions mt-8 flex flex-wrap gap-3 max-sm:gap-2.5 [&>a+a]:border-accent-foreground [&>a+a]:bg-transparent [&>a+a]:text-primary-text [&>a:first-child]:rounded-md [&>a:first-child]:bg-primary-text [&>a:first-child]:text-background-rich [&>a]:min-h-[46px] [&>a]:rounded-xs [&>a]:px-[18px] [&>a]:py-2.5 [&>a]:text-[15px] max-sm:[&>a]:whitespace-normal max-sm:[&>a]:text-left">
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
