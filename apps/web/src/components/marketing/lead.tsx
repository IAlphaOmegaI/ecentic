import { getLocale, getMessages } from "next-intl/server";
import { LeadForm } from "./lead-form";

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
  return (
    <LeadForm
      kind={kind}
      topic={topic}
      title={title}
      triggerLabel={triggerLabel}
      locale={locale}
      copy={enterpriseLead}
    />
  );
};
