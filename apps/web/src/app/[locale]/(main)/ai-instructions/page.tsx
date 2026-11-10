import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { agentInstructions } from "@/lib/agent-discovery";

export const generateMetadata = async () => {
  const { enterpriseRecovery } = await getMessages();
  return marketingMetadata(
    enterpriseRecovery.instructions.meta,
    "/ai-instructions",
  );
};

export default async () => {
  const { enterpriseRecovery } = await getMessages();
  return (
    <MarketingPage
      content={enterpriseRecovery.instructions}
      path="/ai-instructions"
      sectionChildren={{
        "machine-guidance": (
          <div className="marketing-cell">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words bg-background-dimmed p-6 font-mono text-sm leading-relaxed">
              <code>{agentInstructions}</code>
            </pre>
          </div>
        ),
      }}
    />
  );
};
