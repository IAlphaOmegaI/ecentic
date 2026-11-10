import { getLocale, getMessages } from "next-intl/server";
import { InlineLead } from "./inline-lead";
import { InterestLead } from "./interest-lead";

export const MarketingLead = async ({
  kind,
  topic,
  title,
  triggerLabel,
}: {
  kind: "interest" | "integration" | "partner";
  topic: string;
  title?: string;
  triggerLabel?: string;
}) => {
  const locale = await getLocale();
  const { enterpriseLead } = await getMessages();
  if (kind === "interest") {
    return (
      <InterestLead
        topic={topic}
        title={title}
        triggerLabel={triggerLabel}
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
