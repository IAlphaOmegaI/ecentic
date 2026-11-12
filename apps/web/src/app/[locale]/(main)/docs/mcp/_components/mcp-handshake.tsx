import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { JourneySteps } from "@/components/marketing/connected-journey";

const exchanges = [
  { method: "initialize", response: "200" },
  { method: "notifications/initialized", response: "202" },
] as const;

export const McpHandshake = ({
  copy,
  details,
  example,
}: McpHandshake.Props) => (
  <div data-mcp-handshake className="grid min-w-0 lg:grid-cols-[5fr_6fr]">
    <div className="min-w-0 border-accent-foreground bg-linear-to-br from-primary/10 via-transparent to-transparent max-lg:border-b lg:border-r">
      <div className="border-accent-foreground border-b px-8 py-6 max-sm:px-4">
        <p id="mcp-handshake-label" className="font-medium text-foreground">
          {copy.label}
        </p>
      </div>
      <JourneySteps
        label={copy.label}
        items={exchanges.map((exchange, index) => ({
          id: exchange.method,
          title: copy.tabs[index] ?? exchange.method,
          icon: index === 0 ? "connect" : "code",
          content: (
            <div className="flex min-w-0 flex-col gap-6">
              <dl className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <dt className="text-foreground-dimmed text-sm">
                    {copy.request}
                  </dt>
                  <dd className="wrap-anywhere mt-2 font-mono text-foreground text-xs leading-relaxed">
                    {exchange.method}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-foreground-dimmed text-sm">
                    {copy.response}
                  </dt>
                  <dd className="mt-2 font-mono text-foreground text-xl">
                    {exchange.response}
                  </dd>
                </div>
              </dl>
              <p className="font-medium text-foreground">
                {copy.result[index]}
              </p>
              {details[index]}
            </div>
          ),
        }))}
      />
    </div>
    <div
      data-mcp-handshake-source
      className="flex min-w-0 flex-col bg-background [&>figure]:flex-1"
    >
      {example}
    </div>
  </div>
);

export namespace McpHandshake {
  export type Props = {
    copy: AppConfig["Messages"]["docsMcpPage"]["handshake"];
    details: readonly ReactNode[];
    example: ReactNode;
  };
}
