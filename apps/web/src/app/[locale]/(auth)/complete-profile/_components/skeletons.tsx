import { getTranslations } from "next-intl/server";
import { AuthFormSkeleton, AuthShell } from "../../_components/auth-shell";

export const CompleteProfileSkeleton = async () => {
  const translate = await getTranslations("completeProfile");
  const translateAuth = await getTranslations("authUX");
  return (
    <AuthShell
      title={translate("title")}
      description={translateAuth("completeProfile.description")}
    >
      <AuthFormSkeleton />
    </AuthShell>
  );
};
