"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { updateAnalyticsConsent } from "@/lib/analytics-consent";

const STORAGE_KEY = "ecentic-cookie-consent";

const DECISIONS = ["granted", "denied"] as const;

export type ConsentDecision = (typeof DECISIONS)[number];

const parse = (value: string | null) =>
  DECISIONS.includes(value as ConsentDecision)
    ? (value as ConsentDecision)
    : null;

const syncGoogleConsent = (decision: ConsentDecision) =>
  updateAnalyticsConsent(
    decision === "granted",
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  );

export type ConsentContext = {
  /** `null` means undecided — the visitor has not answered the banner yet. */
  decision: ConsentDecision | null;
  /** False until the stored decision has been read; nothing should act before it. */
  isReady: boolean;
  accept: () => void;
  reject: () => void;
  /** Clears the stored answer and re-opens the banner (consent withdrawal). */
  revisit: () => void;
};

const ConsentContext = createContext<ConsentContext | null>(null);

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context)
    throw new Error("useConsent must be used within a ConsentProvider");

  return context;
};

export const ConsentProvider = ({ children }: PropsWithChildren) => {
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  // localStorage is read after mount so the server and the first client render
  // agree. Until it resolves, `isReady` keeps the banner hidden and analytics
  // opted out — otherwise a returning visitor who declined would see the banner
  // flash back on every navigation.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = (() => {
      try {
        return parse(window.localStorage.getItem(STORAGE_KEY));
      } catch {
        return null;
      }
    })();

    syncGoogleConsent(stored ?? "denied");

    setDecision(stored);
    setIsReady(true);
  }, []);

  const record = useCallback((next: ConsentDecision) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Consent still applies to this visit when storage is blocked. */
    }
    syncGoogleConsent(next);
    setDecision(next);
  }, []);

  const accept = useCallback(() => record("granted"), [record]);
  const reject = useCallback(() => record("denied"), [record]);

  const revisit = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Withdrawal must work even when storage is blocked. */
    }
    syncGoogleConsent("denied");
    setDecision(null);
  }, []);

  const context = useMemo(
    () => ({ decision, isReady, accept, reject, revisit }),
    [decision, isReady, accept, reject, revisit],
  );

  return (
    <ConsentContext.Provider value={context}>
      {children}
    </ConsentContext.Provider>
  );
};
