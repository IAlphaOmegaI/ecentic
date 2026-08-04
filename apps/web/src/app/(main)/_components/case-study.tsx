import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import { Plus } from "@/components/plus";
import DuaLogo from "@/public/partners/dua-flavours.png";
import { Counter } from "./counter";

const metrics = [
  { value: "+15%", label: "AI-agent visits" },
  { value: "+12%", label: "sales" },
] as const;

export const CaseStudy = () => (
  <section className="relative -left-[calc(50vw-50%)] w-screen">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="grid md:grid-cols-2">
        <div className="relative flex flex-col gap-4 p-6 md:p-12">
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
          <Image
            src={DuaLogo}
            alt="DUA Flavours"
            className="h-11 w-auto self-start"
          />
          <p className="font-light text-primary text-xl">Customer story</p>
          <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
            DUA Flavours went from skipped to picked — in 30 days.
          </h2>
          <p className="max-w-xl font-light text-foreground-dimmed text-lg">
            DUA Flavours connected their store, and Ecentic showed exactly which
            products AI agents were skipping — then rewrote the listings. Within
            a month, the agents started sending shoppers their way.
          </p>
          <p className="mt-auto flex items-center gap-2 pt-4 text-foreground-dimmed text-sm">
            <CheckIcon className="size-4 shrink-0 text-primary" />
            Verified Ecentic customer · published with permission
          </p>
        </div>

        <div className="grid divide-y divide-accent-foreground border-accent-foreground border-t md:grid-rows-2 md:border-t-0 md:border-l">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="relative flex flex-col justify-center gap-1 bg-background-dimmed p-6 md:p-12"
            >
              {index === 0 && (
                <>
                  <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
                  <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
                </>
              )}
              <Counter
                value={metric.value}
                delay={index * 0.15}
                className="font-body font-bold text-6xl text-primary md:text-7xl"
              />
              <p className="font-body text-foreground text-lg">
                {metric.label}
              </p>
              <p className="font-light text-foreground-dimmed text-sm">
                in 30 days
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
