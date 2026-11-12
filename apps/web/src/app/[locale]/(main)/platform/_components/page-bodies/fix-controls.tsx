import { JourneySteps } from "@/components/marketing/connected-journey";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";

const icons = ["catalog", "access", "code", "compare"] as const;

export const FixControls = ({ section }: FixControls.Props) => (
  <div className="relative grid min-w-0 border-accent-foreground border-t bg-linear-to-br from-primary/10 via-background to-background lg:grid-cols-[1.2fr_1fr]">
    <JourneySteps
      label={section.title}
      items={(section.items ?? []).map((item, index) => ({
        id: String(index),
        title: item.title,
        icon: icons[index] ?? "catalog",
        content: <p className="max-w-[56ch]">{item.body}</p>,
      }))}
    />
    <div
      aria-hidden
      className="relative min-h-72 min-w-0 border-accent-foreground border-t lg:border-t-0 lg:border-l"
    >
      <div className="sticky top-28 aspect-square max-h-[600px] w-full overflow-hidden text-primary-text">
        <EvolvingAscii artwork="console" />
      </div>
    </div>
  </div>
);

export namespace FixControls {
  export type Props = { section: MarketingPage.Section };
}
