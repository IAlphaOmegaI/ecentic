import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { ChannelsWorkspace } from "../../channels/_components/workspace";
export const ScannerShell = async ({ children }: PropsWithChildren) => {
  const translate = await getTranslations("webmcpScanner.dashboard");
  return (
    <ChannelsWorkspace
      subject="webmcp"
      title={translate("title")}
      description={translate("description")}
    >
      {children}
    </ChannelsWorkspace>
  );
};
