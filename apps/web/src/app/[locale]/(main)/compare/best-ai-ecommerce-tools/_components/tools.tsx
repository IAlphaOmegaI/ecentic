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
import { Plus } from "@/components/plus";

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
      className: "w-[31%]",
    },
  ] as const;

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="px-7 pt-16 pb-8 max-sm:px-4 max-sm:pt-10">
          <span className="font-normal text-3xl text-primary">
            {translate("tools.number")}
          </span>
          <h2 className="mt-2 font-heading font-medium text-foreground-rich">
            {translate("tools.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg max-sm:text-base">
            {translate("tools.description")}
          </p>
        </div>

        <div className="relative border-accent-foreground border-t">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <p className="border-accent-foreground border-b bg-background px-4 py-3 font-medium text-foreground text-sm md:hidden">
            {translate("tools.scrollHint")}
          </p>

          <ScrollArea
            role="region"
            aria-label={translate("tools.title")}
            className="max-w-full"
            classList={{
              viewport:
                "focus-visible:outline-2 focus-visible:outline-primary-text",
            }}
          >
            <Table className="min-w-[56rem] border-b-0 bg-background text-left">
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
                    className="border-accent-foreground border-b bg-background last:border-b-0"
                  >
                    <TableHead
                      scope="row"
                      className="whitespace-normal px-7 py-6 align-top font-body font-medium text-foreground text-xl normal-case tracking-normal max-sm:px-4"
                    >
                      {tool.name}
                      {tool.us && (
                        <span className="ml-2 font-normal text-base text-primary-text">
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
                    <TableCell className="px-7 py-6 align-top font-normal text-foreground-dimmed leading-relaxed max-sm:px-4">
                      {tool.wrongPick}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </section>
  );
};
