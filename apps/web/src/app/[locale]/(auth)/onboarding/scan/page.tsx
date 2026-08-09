import {
  CheckBadgeIcon,
  ClockIcon,
  PhotoIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import { connection } from "next/server";
import { getMessages, getTranslations } from "next-intl/server";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { formatScanEstimate } from "@/lib/scan-estimate";
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

const statColors = {
  products: "text-blue-500",
  competitorsMatched: "text-orange-500",
  simulations: "text-green-500",
  estimatedTime: "text-red-500",
} as const;

export default async () => {
  await connection();

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
      : Promise.resolve({ total: 0, selected: 0 }),
  ]);

  const simulations = productCount * competitorCounts.selected * 3;
  const estimation = formatScanEstimate(simulations);

  const labels = [
    {
      key: "products" as const,
      value: productCount.toLocaleString(),
    },
    {
      key: "competitorsMatched" as const,
      value: competitorCounts.selected.toLocaleString(),
    },
    {
      key: "simulations" as const,
      value: simulations.toLocaleString(),
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
      <Motion.Stagger className="flex h-full flex-col overflow-y-auto border-accent-foreground border-b">
        <Motion.Item className="w-full border-accent-foreground border-b px-8">
          <div className="relative flex flex-col border-accent-foreground border-x p-6">
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <h2 className="font-medium text-4xl text-foreground">
              {translate("page.title")}
            </h2>
            <p className="font-light text-2xl text-foreground-dimmed">
              {translate("page.description")}
            </p>
          </div>
        </Motion.Item>

        <Motion.Item className="border-accent-foreground border-b px-8">
          <div className="relative grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-x">
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {models.map((model) => (
              <div
                key={model.model}
                className="flex h-full flex-col bg-background-dimmed p-4"
              >
                <Image
                  src={modelLogos[model.model as keyof typeof modelLogos]}
                  alt={model.model}
                  width={48}
                  height={48}
                />
                <span className="mt-6 text-foreground text-xl">
                  {model.model}
                </span>
                <span className="font-light text-foreground-dimmed text-sm leading-tight">
                  {model.description}
                </span>
              </div>
            ))}
          </div>
        </Motion.Item>

        <Motion.Item className="h-12 w-full border-accent-foreground border-b px-8">
          <div className="flex flex-col border-accent-foreground border-x p-6" />
        </Motion.Item>

        <Motion.Item className="px-8">
          <div className="relative grid size-full max-h-full grid-cols-2 gap-px border-accent-foreground border-x bg-accent-foreground">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {labels.map(({ key, value }) => {
              const Icon = statIcons[key];
              return (
                <div key={key} className="bg-background-dimmed p-4">
                  <Icon className={cn("mb-6 size-12", statColors[key])} />
                  <p className="font-medium text-2xl text-foreground">
                    {value}
                  </p>
                  <p className="font-light text-foreground-dimmed">
                    {translate(`stats.${key}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </Motion.Item>

        <div className="min-h-0 flex-1 px-8">
          <div className="h-full border-accent-foreground border-x" />
        </div>
      </Motion.Stagger>
    </ScanRunner>
  );
};
