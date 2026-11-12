"use client";

import { useEffect } from "react";
import {
  loadConsentedAnalytics,
  updateAnalyticsConsent,
} from "@/lib/analytics-consent";
import { useConsent } from "./consent";

export const ConsentedAnalytics = () => {
  const { decision, isReady } = useConsent();
  useEffect(() => {
    const identifier = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!identifier) return;
    if (isReady && decision === "granted") loadConsentedAnalytics(identifier);
    else updateAnalyticsConsent(false, identifier);
  }, [decision, isReady]);
  return null;
};
