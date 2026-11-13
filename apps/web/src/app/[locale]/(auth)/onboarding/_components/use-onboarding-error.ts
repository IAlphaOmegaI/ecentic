"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { onboardingErrorKey } from "@/lib/onboarding-errors";

export const useOnboardingError = () => {
  const translate = useTranslations("onboarding.experience.errors");
  return useCallback(
    (error: unknown) => translate(onboardingErrorKey(error)),
    [translate],
  );
};
