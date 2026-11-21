import { getTranslations } from "next-intl/server";
import * as Outbound from "@/server/app/outbound";
import * as LinkedInAccounts from "@/server/app/outbound/linkedin-accounts";
import { Environment } from "@/server/utils/environment";
import { PlaybookEditor } from "../_components/playbook";
import { WorkspacePage } from "../_components/workspace";
export default function Page() {
  return (
    <WorkspacePage section="playbook">
      <PlaybookData />
    </WorkspacePage>
  );
}
const PlaybookData = async () => {
  const [policy, accounts] = await Promise.all([
    Outbound.getPlaybook(Environment.SERVER),
    LinkedInAccounts.list(),
  ]);
  if (!policy.success) {
    const t = await getTranslations("outbound.common");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("error")}
      </p>
    );
  }
  return (
    <PlaybookEditor
      value={policy.data.settings}
      revision={policy.data.revision}
      linkedinAccounts={accounts.success ? accounts.data : []}
    />
  );
};
