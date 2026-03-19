import { PhotoIcon, SquareChartIcon, SunsetIcon, CheckBadgeIcon } from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import type { SVGProps } from "react";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { ScanRunner } from "./_components/scan-runner";

const OpenAILogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.91 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.776.776 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.767.767 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.843-3.372 2.015-1.163a.076.076 0 0 1 .072 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.398-.678zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.776.776 0 0 0-.392.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const AnthropicLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.304 3.541 13.766 12.6l3.538 9.059H24L17.304 3.541zM6.696 3.541 0 21.659h6.696l3.538-9.059-3.538-9.059z" />
  </svg>
);

const GeminiLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.304 14.304 0 0 0 12 12 14.304 14.304 0 0 0-12 12" />
  </svg>
);

const models = [
  { model: "GPT-4", color: "text-blue-500", desc: "Spec-focused reasoning", logo: OpenAILogo },
  { model: "Claude", color: "text-orange-500", desc: "Contextual analysis", logo: AnthropicLogo },
  { model: "Gemini", color: "text-green-500", desc: "Price-quality ratio", logo: GeminiLogo },
] as const;

export default async () => {
  const [products, competitors] = await Promise.all([
    unwrapResult(Product.getForCurrentUser()),
    unwrapResult(Competitor.getForCurrentUser()),
  ]);

  const selected = competitors.filter((record) => record.selected);
  const simulations = products.length * selected.length * 3;

  const estimation = (() => {
    switch (true) {
      case simulations <= 30:
        return "~15 sec";
      case simulations <= 100:
        return "~30 sec";
      case simulations <= 300:
        return "~1 min";
      default:
        return "~2 min";
    }
  })();

  return (
    <ScanRunner simulations={simulations}>
      {/* Title */}
      <div className="border-b border-accent-foreground pb-8">
        <h1 className="font-medium text-3xl text-foreground leading-tight">
          See who's winning.
        </h1>
        <p className="mt-2 font-light text-foreground-dimmed">
          GPT-4, Claude & Gemini will simulate real shopping queries across your
          products and competitors.
        </p>
      </div>

      {/* Models + Stats — single merged grid */}
      <div className="flex flex-col gap-px border border-accent-foreground bg-accent-foreground">
        <div className="grid grid-cols-3 gap-px">
          {models.map(({ model, color, desc, logo: Logo }) => (
            <div key={model} className="flex flex-col gap-1 bg-background p-5">
              <Logo className={cn("mb-1 size-6", color)} />
              <span className="font-semibold text-xl text-foreground">
                {model}
              </span>
              <span className="font-light text-foreground-dimmed text-sm">
                {desc}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-px">
          {[
            { label: "Products", value: products.length.toLocaleString(), icon: PhotoIcon, color: "text-blue-500" },
            { label: "Competitors matched", value: selected.length.toLocaleString(), icon: CheckBadgeIcon, color: "text-orange-500" },
            { label: "Simulations to run", value: simulations.toLocaleString(), icon: SquareChartIcon, color: "text-green-500" },
            { label: "Estimated time", value: estimation, icon: SunsetIcon, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-background px-5 py-4">
              <Icon className={cn("mb-2 size-6", color)} />
              <p className="font-semibold text-2xl text-foreground">{value}</p>
              <p className="font-light text-foreground-dimmed text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </ScanRunner>
  );
};
