type SupportWindow = Window & {
  chatwootSettings?: { hideMessageBubble: boolean; locale: string };
  chatwootSDK?: {
    run: (options: { websiteToken: string; baseUrl: string }) => void;
  };
  $chatwoot?: { toggle: (state: "open") => void };
};

/** Called exclusively by the support launcher, never on mount or idle. */
export const openSupportChat = (
  baseUrl: string,
  websiteToken: string,
  locale: string,
) => {
  const target = window as SupportWindow;
  if (target.$chatwoot) {
    target.$chatwoot.toggle("open");
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const finish = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("chatwoot:ready", ready);
    };
    const ready = () => {
      finish();
      target.$chatwoot?.toggle("open");
      resolve();
    };
    const fail = () => {
      finish();
      script.remove();
      reject(new Error("Support chat is unavailable"));
    };
    const timeout = window.setTimeout(fail, 20_000);
    target.chatwootSettings = { hideMessageBubble: true, locale };
    window.addEventListener("chatwoot:ready", ready, { once: true });
    script.src = `${baseUrl.replace(/\/$/, "")}/packs/js/sdk.js`;
    script.async = true;
    script.onload = () => target.chatwootSDK?.run({ websiteToken, baseUrl });
    script.onerror = fail;
    document.head.append(script);
  });
};
