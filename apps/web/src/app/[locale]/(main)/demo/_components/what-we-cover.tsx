import { CircleBoltIcon } from "@zenncore/icons";
import { getMessages, getTranslations } from "next-intl/server";
import { AgentStrip } from "@/app/[locale]/(main)/_components/agent-strip";
import { IndexSection } from "@/app/[locale]/(main)/_components/index-section";

export const WhatWeCover = async () => {
  const translate = await getTranslations("demo");
  const messages = await getMessages();
  const body = messages.demo.whatWeCover.body;
  const items = messages.demo.whatWeCover.items;

  return (
    <IndexSection
      number={translate("whatWeCover.number")}
      icon={CircleBoltIcon}
      title={translate("whatWeCover.title")}
      description={translate("whatWeCover.description")}
      body={body}
      label={translate("whatWeCover.label")}
      items={items}
      accent={
        <AgentStrip label={translate("whatWeCover.agentStripLabel")} />
      }
    />
  );
};
