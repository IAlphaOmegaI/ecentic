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

const STORAGE_KEY = "ecentic-cookie-consent";

const DECISIONS = ["granted", "denied"] as const;

export type ConsentDecision = (typeof DECISIONS)[number];

const parse = (value: string | null) =>
  DECISIONS.includes(value as ConsentDecision)
    ? (value as ConsentDecision)
    : null;

/**
 * Only `analytics_storage` ever moves. Ad signals stay denied permanently:
 * nothing here feeds an ad network, and the privacy policy commits to that in
 * writing — so granting them would make the page contradict the policy.
 */
const signal = (decision: ConsentDecision) => ({
  analytics_storage: decision,
});

const syncGoogleConsent = (decision: ConsentDecision) =>
  window.gtag?.("consent", "update", signal(decision));

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
    const stored = parse(window.localStorage.getItem(STORAGE_KEY));

    // Consent Mode defaults to denied on every load, so a stored "granted" has
    // to be replayed here; a stored "denied" already matches the default.
    if (stored === "granted") syncGoogleConsent(stored);

    setDecision(stored);
    setIsReady(true);
  }, []);

  const record = useCallback((next: ConsentDecision) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    syncGoogleConsent(next);
    setDecision(next);
  }, []);

  const accept = useCallback(() => record("granted"), [record]);
  const reject = useCallback(() => record("denied"), [record]);

  const revisit = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
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
