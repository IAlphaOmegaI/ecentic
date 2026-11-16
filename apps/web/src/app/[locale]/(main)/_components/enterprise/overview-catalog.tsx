import { cn } from "@zenncore/utils";
import Image from "next/image";
import { Motion } from "@/components/motion";

/** A printed catalog: one bound front page and two quietly fanned backing leaves. */
export const OverviewCatalog = ({
  className,
  view = "catalog",
  animated = false,
}: {
  className?: string;
  view?: "catalog" | "json";
  animated?: boolean;
}) => (
  <div
    aria-hidden
    data-overview-catalog
    data-catalog-view={view}
    className={cn("relative isolate aspect-square w-full", className)}
  >
    <div className="absolute inset-x-1/6 inset-y-1/12 -rotate-12 rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed" />
    <div className="absolute inset-x-1/6 inset-y-1/12 rotate-12 rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed" />
    <div className="absolute inset-x-1/8 inset-y-1/12 overflow-hidden rounded-lg border border-foreground/15 bg-background-rich shadow-emphasis/10 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 border-accent-foreground border-r bg-background-dimmed" />
      <Motion.Item
        initial={false}
        animate={{ opacity: view === "catalog" ? 1 : 0 }}
        transition={{ duration: animated ? 0.35 : 0 }}
        className="absolute inset-0 flex h-full flex-col px-2 pt-2 pb-2 sm:px-3 sm:pt-3 sm:pb-3"
      >
        <div className="ml-1 flex items-center justify-between gap-2">
          <div className="h-1 w-1/2 rounded-full bg-primary" />
          <div className="size-1 rounded-full bg-primary/50" />
        </div>
        <div className="mt-1 ml-1 h-0.5 w-1/3 rounded-full bg-foreground-dimmed/30" />
        <div className="mt-2 ml-1 grid min-h-0 flex-1 grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
          {["espresso-cup", "package", "tube", "box"].map((subject) => (
            <div key={subject} className="flex min-h-0 flex-col gap-1">
              <div className="relative flex min-h-0 flex-1 items-center justify-center rounded-lg bg-primary/8">
                {subject === "espresso-cup" ? (
                  <Image
                    src="/images/marketing/hero-espresso-cup.webp"
                    width={512}
                    height={512}
                    alt=""
                    sizes="(min-width: 640px) 64px, 32px"
                    className="absolute inset-0 size-full object-contain mix-blend-multiply"
                  />
                ) : subject === "package" ? (
                  <div className="h-2/3 w-3/5 rounded-lg border border-primary-rich/40 bg-linear-to-br from-primary-rich to-primary-text" />
                ) : subject === "tube" ? (
                  <div className="h-3/4 w-1/3 -rotate-12 rounded-full bg-linear-to-r from-primary-text to-primary-rich" />
                ) : (
                  <div className="h-1/2 w-3/4 rounded-lg bg-linear-to-br from-primary to-primary-text" />
                )}
              </div>
              <div className="h-0.5 w-4/5 rounded-full bg-foreground-dimmed/35" />
              <div className="h-0.5 w-1/2 rounded-full bg-foreground-dimmed/20" />
            </div>
          ))}
        </div>
      </Motion.Item>
      <Motion.Item
        initial={false}
        animate={{ opacity: view === "json" ? 1 : 0 }}
        transition={{ duration: animated ? 0.35 : 0 }}
        className="absolute inset-0"
      >
        <pre className="absolute top-2 left-3 m-0 w-max origin-top-left scale-50 font-mono text-foreground-dimmed text-sm leading-4 sm:top-3 sm:left-4 sm:scale-75">
          {"{\n"}
          <span className="text-primary-text">{'"products"'}</span>
          {": [\n"}
          {["01", "02", "03", "04"].map((productId, index) => (
            <span key={productId}>
              {"{"}
              <span className="text-primary-text">{'"id"'}</span>
              {":"}
              <span className="text-foreground">{`"${productId}"`}</span>
              {index < 3 ? "},\n" : "}\n"}
            </span>
          ))}
          {"]}"}
        </pre>
      </Motion.Item>
    </div>
  </div>
);
