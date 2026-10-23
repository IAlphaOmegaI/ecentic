"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { PostHog } from "posthog-js";
import {
  type PropsWithChildren,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useConsent } from "./consent";

const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// PostHog's own names: the identifier, written only under `localStorage+cookie`
// persistence (so only after consent), and the opt-in flag. The flag is also
// written when opting *out* (as 0), so only an opted-in value counts.
const identity = `ph_${token}_posthog`;
const flag = `__ph_opt_in_out_${token}`;
const optedIn = (value: string | null | undefined) =>
  value === "1" || value === "true" || value === "yes";

/**
 * posthog-js is the second-largest script on the marketing pages (~290KB,
 * ~98KB over the wire), and it captures nothing until the cookie banner is
 * answered. So it is not downloaded until then either: an eager import put it
 * on every first visit's critical path, beside the homepage's LCP image, for
 * a client that was opted out the whole time.
 *
 * A content blocker refusing the chunk rejects the import, so callers end
 * their chain with `.catch(() => undefined)`: analytics going missing must
 * never surface to the person browsing.
 */
const load = () =>
  import("posthog-js").then(({ default: posthog }) => {
    // `posthog` is a module singleton, so it outlives this provider: StrictMode's
    // double-invoke in dev and every Fast Refresh re-run would call init again
    // on an already-initialized client. PostHog no-ops that and warns; skipping
    // it keeps the console clean and the consent config below authoritative.
    if (posthog.__loaded) return posthog;

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "always",
      enable_heatmaps: true,
      // `surveys.js` is 33KB and measured 81.5% unused — nothing in this app
      // creates a survey. Flip this back on the day one is launched.
      disable_surveys: true,
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      // The client is also loaded to undo an earlier opt-in (see `stored`), so
      // it must start opted out and memory-only: `opt_out_capturing_by_default`
      // governs event capture, not the persistence layer, and memory
      // persistence keeps the `ph_<token>_posthog` identifier unwritten until
      // `granted` upgrades it below.
      opt_out_capturing_by_default: true,
      persistence: "memory",
    });

    return posthog;
  });

/**
 * Whether an earlier visit left consented PostHog state behind — an opt-in or
 * an identifier. Only then does declining need the client at all: someone who
 * never accepted has nothing to undo, and should never download it.
 */
const stored = () => {
  const cookies = new Map(
    document.cookie
      .split("; ")
      .map((cookie) => cookie.split("=") as [string, string | undefined]),
  );

  return (
    cookies.has(identity) ||
    window.localStorage.getItem(identity) !== null ||
    optedIn(cookies.get(flag)) ||
    optedIn(window.localStorage.getItem(flag))
  );
};

/**
 * Deletes the identifier an earlier opt-in persisted. Once the client is back
 * on memory persistence PostHog never touches that storage again, so without
 * this the identifier outlives the withdrawal and `stored` keeps finding it,
 * loading the client on every later visit to undo something already undone.
 * The cookie is cleared host-only and on the registrable domain, where
 * PostHog's cross-subdomain cookie lives.
 */
const forget = () => {
  const domain = window.location.hostname.split(".").slice(-2).join(".");

  window.localStorage.removeItem(identity);
  for (const scope of ["", `; domain=.${domain}`]) {
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing from the Safari and Firefox versions this site still serves
    document.cookie = `${identity}=; Max-Age=0; path=/${scope}`;
  }
};

export const PostHogProvider = ({ children }: PropsWithChildren) => {
  const { decision, isReady } = useConsent();
  const [client, setClient] = useState<PostHog | null>(null);
  // The effect below must not re-run when `client` arrives, so it reads the
  // loaded client through a ref rather than depending on the state.
  const loaded = useRef<PostHog | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (decision === "granted") {
      void load()
        .then((posthog) => {
          posthog.set_config({ persistence: "localStorage+cookie" });
          posthog.opt_in_capturing();
          loaded.current = posthog;
          setClient(posthog);
        })
        .catch(() => undefined);
      return;
    }

    // Declining or withdrawing. If consent was never granted there is nothing
    // to undo — init's own settings already hold the line — and touching
    // set_config/opt_out would only churn PostHog's persistence and opt-out
    // flag on behalf of someone who simply said no.
    if (!loaded.current && !stored()) return;

    void load()
      .then((posthog) => {
        setClient(null);
        // Drops the identifier stored while consent was active, so withdrawing
        // removes it rather than just muting capture. After the switch to
        // memory, not before: `reset` writes fresh ids to the storage in use.
        if (posthog.has_opted_in_capturing()) {
          posthog.opt_out_capturing();
          posthog.reset();
          posthog.set_config({ persistence: "memory" });
        }
        forget();
      })
      .catch(() => undefined);
  }, [decision, isReady]);

  return (
    <>
      {client && (
        <Suspense fallback={null}>
          <PostHogPageView client={client} />
        </Suspense>
      )}
      {children}
    </>
  );
};

const PostHogPageView = ({ client }: { client: PostHog }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const url = window.origin + pathname;
    const search = searchParams.toString();
    client.capture("$pageview", { $current_url: url, $search: search });
  }, [pathname, searchParams, client]);

  return null;
};
