// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// First import in the first module Next evaluates on the client: it has to be
// in place before `app-index` tees the inlined Flight stream, which is the
// opening move of hydration. See the module for why that tee can throw.
import "@/lib/readable-stream-tee";

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Replay is added on idle, below — statically importing it here dragged the
  // whole recorder into the eager client chunk.
  environment: process.env.NODE_ENV,

  ignoreErrors: [
    // Safari/extension structured-data parsers crashing on page JSON-LD — external code, not ours
    /@context.*toLowerCase/,
    // Browser extensions' internal postMessage RPC losing its target frame — external code, not ours
    /Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/,
    // React's removeChild fails when a browser translate/reader-mode feature or extension
    // mutates DOM nodes React also manages — external mutation, not an app bug
    "The object can not be found here.",
    // Meta's in-app browser (Instagram/Facebook) injects a native bridge that posts to
    // window.webkit.messageHandlers on pagehide; it throws when the WKWebView bridge is
    // absent — Meta's injected script, not ours. Matches both the iOS phrasing
    // ("undefined is not an object (evaluating 'window.webkit.messageHandlers')") and
    // the Chromium one ("Cannot read properties of undefined (reading 'messageHandlers')")
    /messageHandlers/,
    // Android twin of the above: Meta's in-app browser injects
    // navigation_performance_logger_android, which posts to a Java bridge object on
    // beforeunload. The WebView has already collected that object by then, so the
    // bridge throws while the page unloads — Meta's injected script, not ours.
    "Java object is gone",
  ],

  // Chatwoot widget's sdk.js posts to its bubble iframe before it's mounted
  // (esp. in headless/bot browsers) and throws internally — external code, not ours
  denyUrls: [/\/packs\/js\/sdk\.js/],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

/**
 * Session Replay is the heaviest thing this page loads — ~182KB and ~1.25s of
 * main-thread work, measured as the single largest script and a direct feeder of
 * LCP render delay. None of that weight is needed to *detect* an error, only to
 * replay one, so it waits for idle instead of racing the first paint.
 *
 * Deliberately loaded for every session rather than the 10% that
 * `replaysSessionSampleRate` records: `replaysOnErrorSampleRate` is 1.0, so the
 * recorder has to be armed everywhere or error replays quietly drop to a tenth.
 * The sample rates still decide what gets sent; this only decides when the code
 * arrives. The cost is the sliver before idle, which no longer has a replay.
 */
const loadReplay = () => {
  Sentry.lazyLoadIntegration("replayIntegration")
    .then((replayIntegration) => Sentry.addIntegration(replayIntegration()))
    // Offline, blocked by an extension, or the CDN is down. Replay is a
    // diagnostic; losing it must never surface to the person browsing.
    .catch(() => undefined);
};

if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(loadReplay, { timeout: 5000 });
  else window.addEventListener("load", loadReplay, { once: true });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
