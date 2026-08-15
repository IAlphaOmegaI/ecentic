import { GoogleAnalytics } from "@next/third-parties/google";
import { ToastProvider } from "@zenncore/web/components/toast";
import type { Metadata } from "next";
import { Red_Hat_Display } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { type PropsWithChildren, Suspense } from "react";
import "../globals.css";
import { CookieConsent } from "@/components/cookie-consent";
import { ToastList } from "@/components/ui/toast";
import { ConsentProvider } from "@/context/consent";
import { MotionProvider } from "@/context/motion";
// Imported directly rather than through `next/dynamic`. The provider is already
// a client component, so the RSC boundary code-splits it anyway; routing it
// through `dynamic()` from a server component only added a lazy boundary that
// the App Shell prerender has to resolve, which broke instant-UI validation.
import { PostHogProvider } from "@/context/posthog";
import { ThemeProvider } from "@/context/theme";
import { THEME_INIT_SCRIPT } from "@/context/theme-script";
import { openGraphLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-redhat-display",
});

// woff2, subset to latin + latin-ext: 1357KB of TTF became 135KB. TTF is a
// desktop format and was costing ~170KB per weight over the wire even after
// brotli. The `.ttf` originals stay on disk — `lib/og.tsx` feeds them to Satori,
// which cannot read woff2 — they are simply no longer what browsers fetch.
const ltSuperior = localFont({
  src: [
    {
      path: "../../../public/fonts/LTSuperior/LTSuperior-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/LTSuperior/LTSuperior-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../public/fonts/LTSuperior/LTSuperior-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../public/fonts/LTSuperior/LTSuperior-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-lt-superior",
  display: "swap",
});

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations({
    locale,
    namespace: "general.meta",
  });
  const messages = await getMessages({ locale });

  return {
    title: {
      default: translate("title"),
      template: "%s | ecentic",
    },
    description: translate("description"),
    keywords: [...messages.general.meta.keywords],
    authors: [{ name: "ecentic" }],
    creator: "ecentic",
    publisher: "ecentic",
    metadataBase: new URL("https://ecentic.ai"),
    openGraph: {
      type: "website",
      locale: openGraphLocale(locale),
      url: "https://ecentic.ai",
      siteName: "ecentic",
      title: translate("title"),
      description: translate("openGraphDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: translate("title"),
      description: translate("twitterDescription"),
      creator: "@ecentic",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      other: [{ rel: "mask-icon", url: "/images/logo.svg", color: "#1572fa" }],
    },
    verification: {
      google: "BPZoE9wenU7B37RID4Zs8k55_-bf7QJ1Is2_Ym85kio",
    },
    manifest: "/manifest.webmanifest",
    other: {
      "msapplication-config": "/browserconfig.xml",
      "msapplication-TileColor": "#1572fa",
      "msapplication-tap-highlight": "no",
    },
    category: "technology",
    alternates: {
      languages: {
        en: "/",
        es: "/es",
      },
    },
  };
};

export default async ({ children }: PropsWithChildren) => {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* First thing in <head> so the theme class is on <html> before the
            first paint. Deliberately a plain inline script and not `next/script`:
            every strategy but `beforeInteractive` appends to <body> from an
            effect after hydration, which cannot prevent the flash it exists to
            prevent — and injecting it at runtime puts a parse of this body on
            the client's critical path. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: must be inline to run before paint
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <link rel="preconnect" href="https://eu.i.posthog.com" />
        <link
          rel="preconnect"
          href="https://eu-assets.i.posthog.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )} */}
        {/* `lazyOnload`, not `afterInteractive`: the widget pulls ~508KB
            (including a 148KB stylesheet and its own copy of Vue) for a support
            bubble almost nobody opens. Idle time is the right budget for that,
            not the critical path. */}
        {process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL &&
          process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN && (
            <Script id="chatwoot-widget" strategy="lazyOnload">
              {`
            (function(d,t) {
              var BASE_URL="${process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL}";
              var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
              g.src=BASE_URL+"/packs/js/sdk.js";
              g.async = true;
              s.parentNode.insertBefore(g,s);
              g.onload=function(){
                window.chatwootSDK.run({
                  websiteToken: "${process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN}",
                  baseUrl: BASE_URL
                })
              }
          })(document,"script");
            `}
            </Script>
          )}
        <Script src="/webmcp.js" strategy="afterInteractive" />
        {/* GA4 runs alongside PostHog — the two are independent. Pageviews on
            client-side navigations come from GA4's enhanced measurement
            ("page changes based on browser history events"), which reads the
            App Router's pushState calls, so there is no manual pageview hook
            here to double-count against. */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            {/* Consent Mode v2 defaults. This MUST execute before gtag.js, so
                it is beforeInteractive while <GoogleAnalytics> stays on the
                default afterInteractive — if gtag.js won the race it would set
                cookies before hearing that storage is denied. Ad signals are
                hard-coded denied and never updated; only analytics_storage is
                flipped, by ConsentProvider. */}
            <Script id="google-consent-default" strategy="beforeInteractive">
              {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500
              });
            `}
            </Script>
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
          </>
        )}
        <meta name="apple-mobile-web-app-title" content="ecentic" />
      </head>
      <body
        className={`${redHatDisplay.variable} ${ltSuperior.variable} overflow-x-hidden bg-background font-body antialiased`}
        // React Grab hydration errors
        suppressHydrationWarning={process.env.NODE_ENV === "development"}
      >
        <Suspense>
          <ConsentProvider>
            <PostHogProvider>
              <ThemeProvider>
                <MotionProvider>
                  <ToastProvider>
                    <NextIntlClientProvider locale={locale} messages={messages}>
                      <div className="isolate">{children}</div>
                      {/* Must sit under NextIntlClientProvider — `useTranslations`
                          / locale `Link` need the client provider. */}
                      <CookieConsent />
                    </NextIntlClientProvider>
                    <ToastList
                      types={["error", "success", "info", "loading"]}
                    />
                  </ToastProvider>
                </MotionProvider>
              </ThemeProvider>
            </PostHogProvider>
          </ConsentProvider>
        </Suspense>
      </body>
    </html>
  );
};
