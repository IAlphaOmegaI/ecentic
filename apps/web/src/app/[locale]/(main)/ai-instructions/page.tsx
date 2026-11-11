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
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words bg-background-dimmed p-6 font-mono text-sm leading-relaxed">
              <code>{agentInstructions}</code>
            </pre>
          </div>
        ),
      }}
    />
  );
};
