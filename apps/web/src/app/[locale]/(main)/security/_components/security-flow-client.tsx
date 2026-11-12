"use client";

import {
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
  DownloadIcon,
  RobotIcon,
  ShoppingCartIcon,
  UploadIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { getMessages } from "next-intl/server";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";

const connectors = [
  {
    id: "import",
    from: "source",
    to: "ecentic",
    icon: DownloadIcon,
    figure: "catalog",
  },
  {
    id: "request",
    from: "ecentic",
    to: "providers",
    icon: RobotIcon,
    figure: "hub",
  },
  {
    id: "response",
    from: "providers",
    to: "ecentic",
    icon: CommerceCode_3Icon,
    figure: "document",
  },
  {
    id: "apply",
    from: "ecentic",
    to: "store",
    icon: UploadIcon,
    figure: "workflow",
  },
  {
    id: "structuredData",
    from: "ecentic",
    to: "store",
    icon: ShoppingCartIcon,
    figure: "document",
  },
  {
    id: "merchantCenter",
    from: "ecentic",
    to: "merchantCenter",
    icon: CommerceGlobePointerIcon,
    figure: "relay",
  },
] as const;

type Copy = Awaited<ReturnType<typeof getMessages>>["interactiveSecurity"];

const nodeLogos = {
  source: [],
  ecentic: [],
  providers: ["chatgpt", "claude", "gemini", "perplexity"],
  store: ["shopify", "woocommerce"],
  merchantCenter: ["google"],
} as const;

export const SecurityFlowClient = ({ copy }: { copy: Copy }) => (
  <Tabs
    defaultValue="import"
    orientation="vertical"
    data-security-flow-content
    className="marketing-section-grid relative grid min-w-0 border-background-rich/15 border-t lg:grid-cols-[minmax(240px,1fr)_3fr]"
  >
    <MarketingEdgeCrosses />
    <div className="border-background-rich/15 border-b lg:border-r lg:border-b-0">
      <TabsList
        aria-label={copy.title}
        className="grid w-full grid-cols-2 overflow-visible rounded-none border-0 lg:grid-cols-1"
      >
        {connectors.map((connector) => (
          <Tab
            key={connector.id}
            value={connector.id}
            className="group relative h-auto min-h-24 justify-start gap-4 border-background-rich/15 border-r border-b bg-transparent px-4 py-6 text-left text-background-rich/65 hover:bg-background-rich/5 hover:text-background-rich focus-visible:before:outline-primary-rich data-[active]:bg-linear-to-r data-[active]:from-primary/25 data-[active]:to-transparent data-[active]:text-background-rich max-lg:even:border-r-0 lg:border-r-0 lg:px-8 lg:last:border-b-0"
          >
            <connector.icon
              className="size-6 shrink-0 text-primary-rich"
              aria-hidden
            />
            <span className="font-heading text-lg leading-snug">
              {copy.connectors[connector.id].label}
            </span>
            <span
              aria-hidden
              className="absolute inset-y-6 left-0 w-px bg-primary-rich opacity-0 group-data-[active]:opacity-100"
            />
          </Tab>
        ))}
      </TabsList>
    </div>
    {connectors.map((connector) => (
      <TabsPanel
        key={connector.id}
        value={connector.id}
        keepMounted
        className="min-w-0 outline-none data-[hidden]:hidden"
      >
        <div className="grid min-w-0 border-background-rich/15 border-b sm:grid-cols-[1fr_1fr]">
          <div className="flex flex-col justify-center px-4 py-8 md:px-8">
            <p className="font-heading text-2xl text-background-rich">
              {copy.connectors[connector.id].label}
            </p>
            <div className="relative mt-8 space-y-8 before:absolute before:inset-y-2 before:left-1 before:w-px before:bg-background-rich/25">
              {[connector.from, connector.to].map((node) => (
                <div key={node} className="relative pl-8">
                  <span
                    aria-hidden
                    className="absolute top-2 left-0 size-2 rounded-full bg-primary-rich ring-4 ring-primary-text"
                  />
                  {nodeLogos[node].length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-4">
                      {nodeLogos[node].map((provider) => (
                        <ProviderLogo
                          key={provider}
                          provider={provider}
                          decorative
                          className={cn(
                            "h-8 w-auto max-w-24 rounded-none object-contain",
                            (provider === "woocommerce" ||
                              provider === "perplexity") &&
                              "brightness-0 invert",
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <p className="font-medium text-background-rich">
                    {node === "providers" ? (
                      <Link
                        href="/security#sub-processors"
                        className="text-background-rich underline underline-offset-4"
                      >
                        {copy.nodes[node].label}
                      </Link>
                    ) : (
                      copy.nodes[node].label
                    )}
                  </p>
                  <p className="mt-2 text-background-rich/65 text-sm">
                    {copy.nodes[node].description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center border-background-rich/15 border-t sm:border-t-0 sm:border-l">
            <CommerceFigure
              kind={connector.figure}
              surface="dark"
              className="max-w-80 bg-transparent"
            />
          </div>
        </div>
        <dl className="divide-y divide-background-rich/15">
          {(["what", "when", "control"] as const).map((detail) => (
            <div
              key={detail}
              className="grid gap-2 px-4 py-6 md:grid-cols-[9rem_1fr] md:gap-8 md:px-8"
            >
              <dt className="font-medium text-background-rich">
                {copy.details[detail]}
              </dt>
              <dd className="min-w-0 text-background-rich/70 leading-relaxed">
                {copy.connectors[connector.id][detail]}
              </dd>
            </div>
          ))}
        </dl>
      </TabsPanel>
    ))}
  </Tabs>
);
