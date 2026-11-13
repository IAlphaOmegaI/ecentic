import { getTranslations } from "next-intl/server";
import { AuthShell } from "../_components/auth-shell";
import { CompleteProfileForm } from "./_components/complete-profile-form";

export default async function CompleteProfilePage() {
  const translate = await getTranslations("completeProfile");
  const translateAuth = await getTranslations("authUX");
  return (
    <AuthShell
      title={translate("title")}
      description={translateAuth("completeProfile.description")}
    >
      <CompleteProfileForm />
    </AuthShell>
  );
}
