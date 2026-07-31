import { ArrowRightIcon, TrendDownIcon, TrendUpIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";

const models = [
  {
    id: "gpt4",
    label: "ChatGPT",
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
  {
    id: "perplexity",
    label: "Perplexity",
    logo: "/images/perplexity.svg",
    color: "bg-teal-500",
    textColor: "text-teal-500",
  },
] as const;

export default async ({ params }: PageProps<"/share/[id]">) => {
  await connection();
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
  return (
    <div className="flex h-screen overflow-hidden bg-primary">
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
          "ChatGPT, Claude, Gemini & Perplexity simulated real shopping comparisons",
          "Every product was scored head-to-head against competitors",
          "This report shows exactly where you win — and where you lose",
        ]}
        image="/images/share.png"
        classList={{ image: "opacity-20" }}
      />

      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        <Motion.Stagger
          stagger={0.06}
          className="flex flex-col overflow-y-auto"
        >
          <Motion.Item className="border-accent-foreground border-b px-8">
            <div className="border-accent-foreground border-x p-6">
              <h2 className="font-medium text-4xl text-foreground">
                How does your store stack up?
              </h2>
              <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                Get an in-depth look at how your store stacks up against the
                competition.
              </p>
            </div>
          </Motion.Item>
          <Motion.Item className="border-accent-foreground border-b px-8">
            <div className="grid grid-cols-[1fr_1fr] gap-px border-accent-foreground border-x bg-accent-foreground">
              {/* Score */}
              <div className="flex flex-col justify-between bg-background-dimmed px-6 py-8">
                <div>
                  <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                    AI Agent Score
                  </p>
                  <p
                    className={cn(
                      "font-semibold text-[88px] tabular-nums leading-none",
                      color,
                    )}
                  >
                    {winRate}
                    <span className="text-3xl">%</span>
                  </p>
                </div>
                <div className="mt-6">
                  <div className="h-1 w-full bg-accent-foreground">
                    <div
                      className={cn(
                        "h-full",
                        winRate >= 60
                          ? "bg-success"
                          : winRate >= 30
                            ? "bg-warning"
                            : "bg-error",
                      )}
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                  <p className="mt-3 font-light text-foreground-dimmed text-sm">
                    {message}
                  </p>
                  <p className="mt-1 font-light text-foreground-dimmed/50 text-xs">
                    {scan.completedSimulations} simulations
                  </p>
                  <div className="mt-4 flex gap-6">
                    <div className="flex items-center gap-2">
                      <TrendUpIcon className="size-4 text-success" />
                      <span className="font-semibold text-2xl text-success tabular-nums">
                        {scan.wins}
                      </span>
                      <span className="font-light text-foreground-dimmed text-sm">
                        Wins
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendDownIcon className="size-4 text-error" />
                      <span className="font-semibold text-2xl text-error tabular-nums">
                        {scan.losses}
                      </span>
                      <span className="font-light text-foreground-dimmed text-sm">
                        Losses
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Model cards 2x2 */}
              <div className="grid grid-cols-2 gap-px bg-accent-foreground">
                {models.map((model) => {
                  const rates = modelRates[model.id];
                  const rate = rates?.rate ?? 0;
                  return (
                    <div
                      key={model.id}
                      className="flex flex-col gap-3 bg-background-dimmed px-4 py-5"
                    >
                      <Image
                        src={model.logo}
                        alt={model.label}
                        width={22}
                        height={22}
                      />
                      <div>
                        <p className="font-light text-foreground-dimmed text-xs">
                          {model.label}
                        </p>
                        <p className="font-semibold text-foreground text-xl tabular-nums">
                          {rate}%
                        </p>
                      </div>
                      <div className="h-1 w-full bg-accent-foreground">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <span className="font-light text-success text-xs">
                          {rates?.wins ?? 0}W
                        </span>
                        <span className="font-light text-foreground-dimmed/30 text-xs">
                          /
                        </span>
                        <span className="font-light text-error text-xs">
                          {rates?.losses ?? 0}L
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Motion.Item>

          {scan.topFinding && (
            <Motion.Item className="border-accent-foreground border-b px-8">
              <div className="border-accent-foreground border-x">
                <div className="border-accent-foreground border-b px-6 py-5">
                  <p className="font-body text-2xl text-foreground leading-snug">
                    {scan.topFinding.name}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-[1fr_auto]">
                  <div className="bg-primary px-6 py-6">
                    <p className="mb-3 font-light text-white/60 text-xs uppercase tracking-widest">
                      Impact
                    </p>
                    <p className="font-light text-base text-white leading-relaxed">
                      {scan.topFinding.impactDescription}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-background-dimmed px-8 py-6">
                    <span className="font-semibold text-5xl text-error tabular-nums leading-none">
                      {scan.topFinding.lossPercentage}%
                    </span>
                    <p className="mt-2 font-light text-foreground-dimmed text-xs">
                      of sims lost
                    </p>
                  </div>
                </div>
                {scan.topFinding.missingAttributes.length > 0 && (
                  <div className="flex flex-col gap-3 border-accent-foreground border-t px-6 py-5">
                    <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                      Missing attributes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {scan.topFinding.missingAttributes.map((attr) => (
                        <span
                          key={attr}
                          className="border border-primary/20 bg-primary/8 px-3 py-1 font-light text-primary text-sm"
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

          <Motion.Item className="border-accent-foreground border-b px-8">
            <div className="border-accent-foreground border-x p-6" />
          </Motion.Item>

          <Motion.Item className="px-8">
            <div className="grid border-accent-foreground border-x sm:grid-cols-[1fr_auto]">
              <div className="px-6 py-8">
                <p className="font-body text-2xl text-foreground leading-snug">
                  Ready to win every AI agent's cart?
                </p>
                <p className="font-light text-foreground-dimmed">
                  ecentic auto-optimizes your listings. Free to start.
                </p>
              </div>
              <div className="flex items-end p-6">
                <Button color="primary" render={<Link href="/sign-up" />}>
                  Start free
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </main>
    </div>
  );
};
