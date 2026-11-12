import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { ConnectedJourney } from "@/components/marketing/connected-journey";

const endpoints = ["/api/v1", "/api/v1/discovery", "/api/v1/plans"] as const;
const icons = ["code", "connect", "access"] as const;

export const IndexQuickstart = ({
  content,
  copy,
  examples,
}: IndexQuickstart.Props) => (
  <div>
    <p className="border-accent-foreground border-b px-8 py-6 font-medium text-foreground max-sm:px-4">
      {copy.label}
    </p>
    <div className="grid md:grid-cols-[4fr_7fr]">
      <div className="flex min-w-0 flex-col justify-between gap-8 border-accent-foreground border-b px-8 py-8 max-sm:px-4 md:border-r md:border-b-0">
        <CommerceFigure
          kind="document"
          surface="dark"
          className="min-h-56 bg-transparent"
        />
        <div className="flex flex-col gap-4">
          <p className="font-medium text-foreground">{copy.access}</p>
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {content.intro}
          </p>
        </div>
      </div>
      <ConnectedJourney
        label={copy.label}
        className="border-t-0"
        items={endpoints.map((endpoint, index) => ({
          id: endpoint,
          title: copy.tabs[index] ?? endpoint,
          icon: icons[index],
          content: (
            <div className="flex min-w-0 flex-col gap-6">
              <div>
                <h3>{content.steps[index]?.title}</h3>
                <p className="mt-4 text-foreground-dimmed leading-relaxed">
                  {content.steps[index]?.description}
                </p>
              </div>
              {examples[index]}
              <dl className="grid grid-cols-2 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="min-w-0">
                  <dt className="text-foreground-dimmed text-sm">
                    {copy.request}
                  </dt>
                  <dd className="mt-2 break-all font-mono text-foreground text-xs">
                    <span className="block sm:inline">GET </span>
                    {endpoint}
                  </dd>
                </div>
                <ArrowRightIcon
                  aria-hidden
                  className="size-4 text-primary-rich max-sm:hidden"
                />
                <div className="min-w-0">
                  <dt className="text-foreground-dimmed text-sm">
                    {copy.response}
                  </dt>
                  <dd className="mt-2 break-all font-mono text-foreground text-xs">
                    application/json
                  </dd>
                </div>
              </dl>
              <div>
                <Button color="primary" render={<a href={endpoint} />}>
                  {copy.action.primary}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          ),
        }))}
      />
    </div>
  </div>
);

export namespace IndexQuickstart {
  export type Props = {
    content: AppConfig["Messages"]["docs"]["quickstart"];
    copy: AppConfig["Messages"]["docsIndexPage"]["quickstart"];
    examples: readonly ReactNode[];
  };
}
