"use client";

import { useTranslations } from "next-intl";
import { FeedbackLoading } from "@/components/feedback-state";

/** Keeps the established onboarding frame visible while a step resolves. */
export const OnboardingLoading = () => {
  const translate = useTranslations("general.states.pending");
  return (
    <FeedbackLoading
      title={translate("primary")}
      figure="document-stack"
      scope="page"
    />
  );
};
