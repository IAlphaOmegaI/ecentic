import {
  CheckBadgeIcon,
  ClockIcon,
  PhotoIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import { connection } from "next/server";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import {
  countSimulations,
  formatScanEstimate,
  uniformPairing,
} from "@/lib/scan-estimate";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { ScanRunner } from "./_components/scan-runner";

const modelLogos = {
  ChatGPT: "/images/chatgpt.svg",
  Claude: "/images/claude.svg",
  Gemini: "/images/gemini.svg",
} as const;

const statIcons = {
  products: PhotoIcon,
  competitorsMatched: CheckBadgeIcon,
  simulations: SquareChartIcon,
  estimatedTime: ClockIcon,
} as const;

export default async () => {
  await connection();

  const locale = await getLocale();
  const translate = await getTranslations("onboarding.scan");
  const messages = await getMessages();
  const models = messages.onboarding.scan.models;

  const stores = await unwrapResult(
    Store.getForCurrentUser(Environment.SERVER),
  );
  const store = stores[0] ?? null;

  const [productCount, competitorCounts] = await Promise.all([
    store
      ? unwrapResult(
          Product.countForCurrentUser(Environment.SERVER, { store: store.id }),
        )
      : Promise.resolve(0),
    store
      ? unwrapResult(
          Competitor.countForCurrentUser(Environment.SERVER, {
            store: store.id,
          }),
        )
      : Promise.resolve({ total: 0, selected: 0, judgeable: 0 }),
  ]);

  // `judgeable`, not `selected`: the engine drops priceless rivals before
  // pairing (lib/competitor-evidence.ts), so the two figures on this screen
  // stay arithmetically consistent with the run that follows.
  const simulations = countSimulations(
    uniformPairing(productCount, competitorCounts.judgeable),
  );
  const estimation = formatScanEstimate(simulations);

  const labels = [
    {
      key: "products" as const,
      value: productCount.toLocaleString(locale),
    },
    {
      key: "competitorsMatched" as const,
      value: competitorCounts.judgeable.toLocaleString(locale),
    },
    {
      key: "simulations" as const,
      value: simulations.toLocaleString(locale),
    },
    {
      key: "estimatedTime" as const,
      value: estimation,
    },
  ] as const;

  return (
    <ScanRunner
      store={store?.id ?? null}
      simulations={simulations}
      productCount={productCount}
      selectedCompetitorCount={competitorCounts.selected}
    >
      <Motion.Stagger className="flex min-w-0 flex-col">
        <Motion.Item className="relative isolate border-accent-foreground border-b px-6 py-7 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/15 via-primary/5 to-background-rich [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_12px),calc(100%_-_12px)_100%,12px_100%,0_calc(100%_-_12px))]"
          />
          <h1 className="font-heading text-3xl text-foreground-rich tracking-tight sm:text-4xl">
            {translate("page.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
            {translate("page.description")}
          </p>
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        </Motion.Item>

        <Motion.Item className="grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-b bg-background-rich sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {models.map((model) => (
            <div
              key={model.model}
              className="flex min-w-0 items-start gap-4 px-6 py-5 sm:flex-col sm:gap-3 sm:px-5"
            >
              <Image
                src={modelLogos[model.model as keyof typeof modelLogos]}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h2 className="font-medium text-foreground-rich">
                  {model.model}
                </h2>
                <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                  {model.description}
                </p>
              </div>
            </div>
          ))}
        </Motion.Item>

        <Motion.Item className="grid grid-cols-2 gap-px bg-accent-foreground">
          {labels.map(({ key, value }) => {
            const Icon = statIcons[key];
            return (
              <div
                key={key}
                className="min-w-0 bg-background-rich px-6 py-6 sm:px-8"
              >
                <Icon
                  aria-hidden="true"
                  className="mb-4 size-6 text-primary-text"
                />
                <p className="font-medium text-2xl text-foreground-rich tabular-nums">
                  {value}
                </p>
                <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
                  {translate(`stats.${key}`)}
                </p>
              </div>
            );
          })}
        </Motion.Item>
      </Motion.Stagger>
    </ScanRunner>
  );
};
