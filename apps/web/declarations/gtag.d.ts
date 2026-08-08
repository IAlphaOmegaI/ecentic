/**
 * `@next/third-parties` declares `window.dataLayer` but not `window.gtag`.
 * Consent updates must go through `gtag()` rather than a raw `dataLayer.push`:
 * gtag.js reads the `arguments` object that `gtag()` pushes, and a plain array
 * pushed in its place is not processed as a consent command.
 *
 * `gtag` is defined by the beforeInteractive default-consent script in the root
 * layout, so it exists before gtag.js loads — but it is optional here because
 * that script only renders when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
