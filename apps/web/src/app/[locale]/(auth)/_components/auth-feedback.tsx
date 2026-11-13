"use client";

import { XCircleIcon } from "@zenncore/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  type AuthErrorKey,
  type AuthOperation,
  authErrorKey,
} from "@/lib/auth-errors";

export const useAuthFeedback = () => {
  const [error, setError] = useState<AuthErrorKey | null>(null);
  return {
    error,
    clear: () => setError(null),
    report: (failure: unknown, operation: AuthOperation) =>
      setError(authErrorKey(failure, operation)),
  };
};

export const AuthFeedback = ({ error }: { error: AuthErrorKey | null }) => {
  const translate = useTranslations("authUX");
  if (!error) return null;

  return (
    <div role="alert" className="mb-5 flex items-start gap-3 text-foreground">
      <XCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-error" />
      <div className="min-w-0 text-sm leading-relaxed">
        <p className="font-medium">{translate("errors.title")}</p>
        <p className="mt-1">{translate(`errors.${error}`)}</p>
      </div>
    </div>
  );
};
