/** Analytics is initialized only after the visitor grants consent. */
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
