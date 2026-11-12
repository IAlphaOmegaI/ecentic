/** GA is loaded only after consent; declining must not send cookieless pings. */
export const updateAnalyticsConsent = (
  granted: boolean,
  identifier?: string,
) => {
  if (!identifier) return;
  Reflect.set(window, `ga-disable-${identifier}`, !granted);
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (granted) return;

  const host = window.location.hostname.split(".");
  const domains = host.map((_, index) => host.slice(index).join("."));
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0] ?? "");
  for (const name of names.filter((name) =>
    /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gac_)/.test(name),
  )) {
    const expired = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    // biome-ignore lint/suspicious/noDocumentCookie: expire existing host-only GA cookies, including browsers without Cookie Store.
    document.cookie = expired;
    for (const domain of domains) {
      // biome-ignore lint/suspicious/noDocumentCookie: also remove GA cookies scoped to an ancestor domain.
      document.cookie = `${expired}; domain=${domain}`;
    }
  }
};

export const loadConsentedAnalytics = (identifier: string) => {
  updateAnalyticsConsent(true, identifier);
  if (document.getElementById("ecentic-consented-analytics")) return;

  window.dataLayer ??= [];
  window.gtag ??= function () {
    // biome-ignore lint/complexity/noArguments: gtag processes IArguments commands; arrays are not equivalent.
    window.dataLayer.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", identifier);
  const script = document.createElement("script");
  script.id = "ecentic-consented-analytics";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(identifier)}`;
  script.async = true;
  script.onerror = () => script.remove();
  document.head.append(script);
};
