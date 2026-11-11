import {
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingEyebrow,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { IntegrationWorkflowGraphic } from "./integration-workflow-graphic";

const workflows = {
  shopify: [
    { kind: "compare", Icon: CommerceChartActivity_2Icon },
    { kind: "publish", Icon: CommerceFilePenIcon },
    { kind: "tracking", Icon: CommerceChartActivity_2Icon },
  ],
  woocommerce: [
    { kind: "compare", Icon: CommerceChartActivity_2Icon },
    { kind: "publish", Icon: CommerceFilePenIcon },
    { kind: "checkout", Icon: CommerceBasketShoppingIcon },
  ],
  googleMerchant: [
    { kind: "sync", Icon: CommercePlug_3SparkleIcon },
    { kind: "checkout", Icon: CommerceBasketShoppingIcon },
    { kind: "audit", Icon: CommerceFileShieldIcon },
    { kind: "readiness", Icon: CommerceFileShieldIcon },
  ],
  productFeeds: [
    { kind: "compare", Icon: CommerceChartActivity_2Icon },
    { kind: "audit", Icon: CommerceFileShieldIcon },
    { kind: "connect", Icon: CommerceCode_3Icon },
  ],
} as const;

/** The same registered workbench, with the capabilities of the actual connection. */
export const IntegrationWorkflow = ({
  section,
  children,
  integration,
}: MarketingSection.Props & {
  integration: keyof typeof workflows;
}) => (
  <MarketingFeatureBand id={section.id} tone="dark">
    <div className="px-7 py-10 max-sm:px-4">
      {section.eyebrow && (
        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
      )}
      <h2 className="max-w-[22ch]">{section.title}</h2>
      {section.description && (
        <p className="mt-4 max-w-[65ch] text-background-rich/70">
          {section.description}
        </p>
      )}
    </div>
    <div
      data-integration-workbench={integration}
      className="relative grid gap-px border border-[var(--rail-color)] border-x-transparent bg-[var(--rail-color)] bg-clip-padding md:grid-cols-2"
    >
      {section.items?.map((item, index) => {
        const workflow = workflows[integration][index];
        if (!workflow) return null;
        const Icon = workflow.Icon;
        return (
          <article
            key={item.title}
            className={cn(
              "relative isolate flex min-w-0 flex-col bg-emphasis-dimmed",
              index === 0 &&
                "bg-linear-to-br from-primary-dimmed/80 via-emphasis-dimmed to-emphasis-dimmed",
              index === 0 && section.items?.length === 3 && "md:row-span-2",
            )}
          >
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
            {index > 0 && (
              <Plus
                className={cn(
                  "top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35",
                  index !== (section.items?.length ?? 0) - 1 && "md:hidden",
                )}
              />
            )}
            <div className="relative z-1 px-7 pt-8 max-sm:px-4">
              <Icon aria-hidden className="mb-6 size-8 text-primary-rich" />
              <h3>{item.title}</h3>
              <p className="mt-4 max-w-[53ch] text-background-rich/75">
                {item.body}
              </p>
              {item.href && (
                <MarketingActions
                  actions={[
                    { label: item.label ?? item.title, href: item.href },
                  ]}
                />
              )}
            </div>
            <IntegrationWorkflowGraphic
              kind={workflow.kind}
              integration={integration}
              large={index === 0 && section.items?.length === 3}
            />
          </article>
        );
      })}
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
      <Plus className="bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 md:block [&>span]:bg-background-rich/35" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    </div>
    {children}
    {section.links && (
      <div className="px-7 py-8 max-sm:px-4">
        <MarketingActions actions={section.links} />
      </div>
    )}
  </MarketingFeatureBand>
);
