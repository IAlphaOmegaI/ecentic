import {
  ArrowRightIcon,
  RocketIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";

const models = [
  {
    id: "gpt4",
    label: "GPT-4",
    logo: "/images/chatgpt.svg",
    color: "bg-blue-500",
    textColor: "text-blue-500",
  },
  {
    id: "claude",
    label: "Claude",
    logo: "/images/claude.svg",
    color: "bg-orange-500",
    textColor: "text-orange-500",
  },
  {
    id: "gemini",
    label: "Gemini",
    logo: "/images/gemini.svg",
    color: "bg-green-500",
    textColor: "text-green-500",
  },
] as const;

export default async ({ params }: PageProps<"/share/[id]">) => {
  const { id } = await params;

  const result = await Scan.getShareData(Environment.SERVER, { id });
  if (!result.success) notFound();

  const { scan, modelRates } = result.data;

  const total = scan.wins + scan.losses;
  const winRate = total > 0 ? Math.round((scan.wins / total) * 100) : 0;

  const color = (() => {
    switch (true) {
      case winRate >= 60:
        return "text-success";
      case winRate >= 30:
        return "text-warning";
      default:
        return "text-error";
    }
  })();

  const message = (() => {
    switch (true) {
      case winRate >= 60:
        return "Ahead of most competitors.";
      case winRate >= 30:
        return "Competitive, but room to grow.";
      default:
        return "AI agents are choosing competitors.";
    }
  })();

  const formatted = new Date(scan.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex h-screen bg-primary">
      <Onboarding
        identifier="share"
        headline={
          <>
            Your results
            <br />
            are in.
          </>
        }
        points={[
          "GPT-4, Claude & Gemini simulated real shopping comparisons",
          "Every product was scored head-to-head against competitors",
          "This report shows exactly where you win — and where you lose",
        ]}
      />

      <main className="flex h-full flex-1 flex-col overflow-y-auto bg-background">
        <div className="flex shrink-0 items-center justify-between border-accent-foreground border-b px-8">
          <div className="flex items-center gap-0 border-accent-foreground border-x px-6 py-3">
            <Image
              src="/images/wordmark.svg"
              alt="écentic"
              width={96}
              height={24}
              className="h-auto w-24"
            />
          </div>
          <p className="font-light text-foreground-dimmed text-sm">
            {formatted}
          </p>
        </div>

        <Motion.Stagger stagger={0.06} className="flex flex-col">
          {/* Win rate hero */}
          <Motion.Item className="border-accent-foreground border-b px-8">
            <div className="grid grid-cols-[1fr_auto] gap-px border-accent-foreground border-x bg-accent-foreground">
              <div className="bg-background-rich px-6 py-6">
                <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                  Overall Win Rate
                </p>
                <p
                  className={cn(
                    "font-semibold text-[72px] leading-none",
                    color,
                  )}
                >
                  {winRate}%
                </p>
                <p className="mt-3 font-light text-foreground text-sm">
                  {message}
                </p>
                <p className="mt-1 font-light text-foreground-dimmed/60 text-xs">
                  {scan.completedSimulations} simulations
                </p>
              </div>
              <div className="flex flex-col divide-y divide-accent-foreground bg-background-rich">
                <div className="flex flex-1 flex-col items-center justify-center px-7 py-4">
                  <TrendUpIcon className="mb-1 size-5 text-success" />
                  <span className="font-semibold text-2xl text-success">
                    {scan.wins}
                  </span>
                  <span className="mt-0.5 font-light text-foreground-dimmed text-xs">
                    Wins
                  </span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-7 py-4">
                  <TrendDownIcon className="mb-1 size-5 text-error" />
                  <span className="font-semibold text-2xl text-error">
                    {scan.losses}
                  </span>
                  <span className="mt-0.5 font-light text-foreground-dimmed text-xs">
                    Losses
                  </span>
                </div>
              </div>
            </div>
          </Motion.Item>

          {/* Per-model breakdown */}
          <Motion.Item className="border-accent-foreground border-b px-8">
            <div className="border-x border-b border-accent-foreground px-4 py-3">
              <p className="font-medium text-foreground text-sm">
                Win rate by model
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-x">
              {models.map((model) => {
                const rates = modelRates[model.id];
                const rate = rates?.rate ?? 0;
                return (
                  <div
                    key={model.id}
                    className="flex flex-col gap-3 bg-background-dimmed px-4 py-4"
                  >
                    <Image
                      src={model.logo}
                      alt={model.label}
                      width={28}
                      height={28}
                    />
                    <div className="flex items-end justify-between">
                      <span
                        className={cn("font-light text-xs", model.textColor)}
                      >
                        {model.label}
                      </span>
                      <span className="font-semibold text-foreground text-lg">
                        {rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-accent-foreground">
                        <div
                          className={cn("h-full", model.color)}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-light text-success text-xs">
                        {rates?.wins ?? 0} W
                      </span>
                      <span className="text-foreground-dimmed/30 text-xs">
                        —
                      </span>
                      <span className="font-light text-error text-xs">
                        {rates?.losses ?? 0} L
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Motion.Item>

          {/* Top finding */}
          {scan.topFinding && (
            <Motion.Item className="border-accent-foreground border-b px-8">
              <div className="border-accent-foreground border-x">
                <div className="border-accent-foreground border-b px-6 py-4">
                  <div className="border-primary border-l-2 pl-4">
                    <p className="font-medium text-foreground text-lg leading-snug">
                      {scan.topFinding.name}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-[1fr_auto]">
                  <div className="bg-primary p-6">
                    <RocketIcon className="size-8 text-background" />
                    <p className="mt-2 mb-2 text-white uppercase tracking-widest">
                      Impact
                    </p>
                    <p className="text-white leading-relaxed">
                      {scan.topFinding.impactDescription}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center border-accent-foreground border-l bg-error p-6">
                    <span className="font-medium text-4xl text-white tabular-nums">
                      {scan.topFinding.lossPercentage}%
                    </span>
                    <p className="mt-2 font-light text-sm text-white">
                      of sims lost
                    </p>
                  </div>
                </div>
                {scan.topFinding.missingAttributes.length > 0 && (
                  <div className="flex flex-col gap-4 p-6">
                    <p className="font-light text-foreground-dimmed uppercase tracking-widest">
                      Missing Attributes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {scan.topFinding.missingAttributes.map((attr) => (
                        <span
                          key={attr}
                          className="border border-primary/30 bg-primary/10 px-2.5 py-1 font-light text-primary text-sm"
                        >
                          {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Motion.Item>
          )}

          {/* CTA */}
          <Motion.Item className="px-8 py-6">
            <div className="flex flex-col gap-4 border-accent-foreground border-x p-6">
              <div>
                <p className="font-medium text-foreground text-lg">
                  Want to fix this?
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm">
                  écentic auto-optimizes your listings so AI agents pick you
                  every time. Free to start.
                </p>
              </div>
              <Button
                variant="flat"
                color="primary"
                render={<Link href="/sign-up" />}
                className="w-full sm:w-auto"
              >
                Start optimizing free
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </main>
    </div>
  );
};
