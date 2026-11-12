import { getLocale, getMessages } from "next-intl/server";
import { MarketingBand } from "@/components/marketing/primitives";
import { ReplayConsole } from "./replay-console";

export const AgentReplay = async ({
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const locale = await getLocale();
  const { interactiveReplay, reviewReplay, reviewSimulate, round15Platform } =
    await getMessages();
  const content = (
    <ReplayConsole
      copy={interactiveReplay}
      labels={reviewReplay}
      locale={locale}
      assistant={reviewSimulate.assistant}
      conversation={round15Platform.replay}
      topEdge={embedded ? "content" : "section"}
    />
  );
  return embedded ? (
    content
  ) : (
    <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
      {content}
    </MarketingBand>
  );
};
