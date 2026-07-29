// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],
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
  ],

  // Chatwoot widget's sdk.js posts to its bubble iframe before it's mounted
  // (esp. in headless/bot browsers) and throws internally — external code, not ours
  //denyUrls: [/\/packs\/js\/sdk\.js/],

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
