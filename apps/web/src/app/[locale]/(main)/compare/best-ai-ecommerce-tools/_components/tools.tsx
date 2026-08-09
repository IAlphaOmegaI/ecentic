import { cn } from "@zenncore/utils";
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

  const cell = "px-6 py-5 align-top md:px-8";

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("tools.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("tools.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("tools.description")}
          </p>
        </div>

        <div className="relative border-accent-foreground border-t">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <p className="border-accent-foreground border-b bg-background-dimmed px-6 py-3 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:hidden">
            {translate("tools.scrollHint")}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left">
              <thead>
                <tr className="border-accent-foreground border-b bg-background-dimmed">
                  {columns.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className={cn(
                        "px-6 py-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.16em] md:px-8",
                        column.className,
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr
                    key={tool.name}
                    className="border-accent-foreground border-b bg-background-rich last:border-b-0"
                  >
                    <th
                      scope="row"
                      className={cn(
                        cell,
                        "font-body font-medium text-foreground text-xl",
                      )}
                    >
                      {tool.name}
                      {tool.us && (
                        <span className="ml-2 font-normal text-base text-primary">
                          {translate("tools.usLabel")}
                        </span>
                      )}
                    </th>
                    <td className={cn(cell, "font-light text-foreground")}>
                      {tool.category}
                    </td>
                    <td
                      className={cn(
                        cell,
                        "font-light text-foreground-dimmed leading-relaxed",
                      )}
                    >
                      {tool.bestAt}
                    </td>
                    <td
                      className={cn(
                        cell,
                        "font-light text-foreground-dimmed leading-relaxed",
                      )}
                    >
                      {tool.wrongPick}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
