import { ScrollArea } from "@zenncore/web/components/scroll-area";
import { getMessages } from "next-intl/server";
import { FormattedSource } from "@/components/marketing/interactive/published-files/formatted-source";
import { DocsCopy } from "../../_components/docs-copy";

export const ApiDefinition = async ({ label, value }: ApiDefinition.Props) => {
  const { docsControls } = await getMessages();
  const source = JSON.stringify(value, null, 2);
  return (
    <figure
      data-api-definition
      className="min-w-0 overflow-hidden bg-emphasis-dimmed"
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-4 border-background-rich/15 border-b px-4 py-2">
        <span className="text-background-rich/65 text-sm">{label}</span>
        <DocsCopy source={source} copy={docsControls} />
      </figcaption>
      <ScrollArea
        className="max-w-full"
        classList={{
          viewport:
            "max-h-128 overscroll-y-auto focus-visible:outline-2 focus-visible:outline-primary-rich focus-visible:-outline-offset-2",
        }}
      >
        <FormattedSource source={source} />
      </ScrollArea>
    </figure>
  );
};

export namespace ApiDefinition {
  export type Props = { label: string; value: unknown };
}
