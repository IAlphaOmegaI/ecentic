import { MarketingShell } from "@/components/marketing/page";

/** Matches the article header and contents/body split while URL data resolves. */
export const BlogArticleSkeleton = ({ label }: { label: string }) => (
  <MarketingShell>
    <div role="status" aria-label={label} aria-busy="true">
      <div aria-hidden="true" className="border-accent-foreground border-b">
        <div className="mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x px-8 pt-16 pb-12 max-sm:w-[calc(100%-32px)] max-sm:px-4 max-sm:pt-12 max-sm:pb-8 lg:px-12">
          <div className="mb-8 h-10 w-36 bg-background-dimmed" />
          <div className="h-14 w-5/6 bg-background-dimmed sm:h-20" />
          <div className="mt-3 h-14 w-2/3 bg-background-dimmed sm:h-20" />
          <div className="mt-6 h-7 max-w-[760px] bg-background-dimmed" />
          <div className="mt-2 h-7 max-w-[600px] bg-background-dimmed" />
          <div className="mt-8 h-5 w-56 bg-background-dimmed" />
        </div>
      </div>
      <div aria-hidden="true" className="border-accent-foreground border-b">
        <div className="mx-auto grid w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)] lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-h-20 border-accent-foreground border-b bg-background-dimmed lg:min-h-[620px] lg:border-r lg:border-b-0" />
          <div className="min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8 lg:px-12">
            <div className="mx-auto max-w-[720px] space-y-5">
              <div className="h-10 w-3/4 bg-background-dimmed" />
              <div className="h-32 bg-background-dimmed" />
              <div className="h-32 bg-background-dimmed" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </MarketingShell>
);
