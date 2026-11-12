"use client";

import {
  ArrowRightIcon,
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
  DownloadIcon,
  RobotIcon,
  ShoppingCartIcon,
  UploadIcon,
} from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { getMessages } from "next-intl/server";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
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
            <div className="mt-6 space-y-4">
              {[connector.from, connector.to].map((node, index) => (
                <div key={node}>
                  {index === 1 && (
                    <ArrowRightIcon
                      className="mb-4 size-4 text-primary-rich"
                      aria-hidden
                    />
                  )}
                  <p className="font-medium text-background-rich">
                    {node === "providers" ? (
                      <Link
                        href="/security#sub-processors"
                        className="text-primary-rich underline underline-offset-4"
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
          <div className="relative flex items-center justify-center border-background-rich/15 border-t bg-linear-to-br from-primary/12 to-transparent sm:border-t-0 sm:border-l">
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
