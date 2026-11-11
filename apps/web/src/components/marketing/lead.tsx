import type { Button } from "@zenncore/web/components/button";
import { getLocale, getMessages } from "next-intl/server";
import { InlineLead } from "./inline-lead";
import { InterestLead } from "./interest-lead";

export const MarketingLead = async ({
  kind,
  topic,
  title,
  triggerLabel,
  triggerColor,
  triggerVariant,
}: MarketingLead.Props) => {
  const locale = await getLocale();
  const { enterpriseLead } = await getMessages();
  if (kind === "interest") {
    return (
      <InterestLead
        topic={topic}
        title={title}
        triggerLabel={triggerLabel}
        triggerColor={triggerColor}
        triggerVariant={triggerVariant}
        locale={locale}
        copy={enterpriseLead}
      />
    );
  }
  return (
    <InlineLead
      kind={kind}
      topic={topic}
      title={title}
      locale={locale}
      copy={enterpriseLead}
    />
  );
};

export namespace MarketingLead {
  export type Props = {
    kind: "interest" | "integration" | "partner";
    topic: string;
    title?: string;
    triggerLabel?: string;
    triggerColor?: Button.Props["color"];
    triggerVariant?: Button.Props["variant"];
  };
}
