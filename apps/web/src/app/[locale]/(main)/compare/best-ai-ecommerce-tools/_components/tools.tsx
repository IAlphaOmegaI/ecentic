import { cn } from "@zenncore/utils";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getMessages, getTranslations } from "next-intl/server";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { GuideToolExplorer } from "./guide-tool-explorer";

export const Tools = async () => {
  const translate = await getTranslations("compare");
  const messages = await getMessages();
  const tools = messages.compare.tools.items;

  const columns = [
    { label: translate("tools.columns.tool"), className: "w-[18%]" },
    { label: translate("tools.columns.category"), className: "w-[20%]" },
    { label: translate("tools.columns.bestAt"), className: "w-[31%]" },
    {
      label: translate("tools.columns.wrongPick"),
      className: "w-[31%] bg-background-dimmed",
    },
  ] as const;

  return (
    <MarketingLightBand id="tool-comparison" className="scroll-mt-24">
      <div className="relative bg-linear-to-br from-primary/6 to-transparent px-7 py-12 max-sm:px-4 max-sm:py-10">
        <span className="font-normal text-3xl text-primary">
          {translate("tools.number")}
        </span>
        <h2 className="mt-4 max-w-3xl text-balance text-foreground-rich">
          {translate("tools.title")}
        </h2>
        <p className="mt-4 max-w-3xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
          {translate("tools.description")}
        </p>
      </div>
      <div className="relative min-w-0 bg-background">
        <GuideToolExplorer
          tools={tools}
          labels={{
            bestAt: translate("tools.columns.bestAt"),
            wrongPick: translate("tools.columns.wrongPick"),
            usLabel: translate("tools.usLabel"),
            views: messages.comparisonGuidePage.views,
          }}
          table={
            <>
              <p className="border-accent-foreground border-b px-4 py-4 font-medium text-foreground text-sm md:hidden">
                {translate("tools.scrollHint")}
              </p>
              <ScrollArea
                viewportProps={{
                  role: "region",
                  "aria-label": translate("tools.title"),
                }}
                className="max-w-full"
                classList={{
                  viewport:
                    "overscroll-y-auto focus-visible:outline-2 focus-visible:outline-primary-text",
                }}
              >
                <Table className="min-w-224 border-b-0 bg-background text-left">
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead
                          key={column.label}
                          scope="col"
                          className={cn(
                            "px-7 py-4 font-medium text-foreground text-sm normal-case tracking-normal max-sm:px-4",
                            column.className,
                          )}
                        >
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tools.map((tool) => (
                      <TableRow
                        key={tool.name}
                        className="border-accent-foreground border-b last:border-b-0"
                      >
                        <TableHead
                          scope="row"
                          className="whitespace-normal px-7 py-6 align-top font-body font-medium text-foreground-rich text-xl normal-case tracking-normal max-sm:px-4"
                        >
                          {tool.name}
                          {tool.us && (
                            <span className="mt-2 block font-normal text-primary-text text-sm">
                              {translate("tools.usLabel")}
                            </span>
                          )}
                        </TableHead>
                        <TableCell className="px-7 py-6 align-top font-normal text-foreground max-sm:px-4">
                          {tool.category}
                        </TableCell>
                        <TableCell className="px-7 py-6 align-top font-normal text-foreground-dimmed leading-relaxed max-sm:px-4">
                          {tool.bestAt}
                        </TableCell>
                        <TableCell className="border-accent-foreground border-l bg-background-dimmed px-7 py-6 align-top font-normal text-foreground-dimmed leading-relaxed max-sm:px-4">
                          {tool.wrongPick}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          }
        />
      </div>
    </MarketingLightBand>
  );
};
