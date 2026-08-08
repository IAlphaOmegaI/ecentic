import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { type PropsWithChildren, Suspense } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ToastProvider } from "@zenncore/web/components/toast";
import { Red_Hat_Display } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
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
import { routing } from "@/i18n/routing";

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-redhat-display",
});

const ltSuperior = localFont({
  src: [
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-lt-superior",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ecentic — Win Every AI Shopping Agent's Cart",
    template: "%s | ecentic",
  },
  description:
    "Optimize product listings for AI shopping agents. Simulate ChatGPT, Claude, Gemini, and Perplexity decisions, diagnose losses, and improve win rate.",
  keywords: [
    "AI shopping agent optimization",
    "e-commerce AI optimization",
    "AI agent economy",
    "product listing optimization",
    "ChatGPT shopping",
    "Claude shopping agent",
    "Gemini shopping",
    "win rate optimization",
    "AI commerce platform",
    "agent SEO",
    "GEO generative engine optimization",
    "Shopify AI optimization",
    "WooCommerce AI",
    "product content optimization",
    "competitive intelligence ecommerce",
  ],
  authors: [{ name: "ecentic" }],
  creator: "ecentic",
  publisher: "ecentic",
  metadataBase: new URL("https://ecentic.ai"),
  alternates: {},
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ecentic.ai",
    siteName: "ecentic",
    title: "ecentic — Win Every AI Shopping Agent's Cart",
    description:
      "Simulate how AI shopping agents choose your products, diagnose why they don't, and auto-optimize your listings. Built for the agent economy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ecentic — Win Every AI Shopping Agent's Cart",
    description:
      "Simulate how ChatGPT, Claude, Gemini & Perplexity choose your products vs. competitors. Diagnose losses. Auto-optimize. Win every cart.",
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
};

export default async ({ children }: PropsWithChildren) => {
  const locale = await (async () => {
    try {
      return await getLocale();
    } catch {
      return routing.defaultLocale;
    }
  })();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://eu.i.posthog.com" />
        <link
          rel="preconnect"
          href="https://eu-assets.i.posthog.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL &&
          process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN && (
            <Script id="chatwoot-widget" strategy="afterInteractive">
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
                    <div className="isolate">{children}</div>
                    <ToastList
                      types={["error", "success", "info", "loading"]}
                    />
                    <CookieConsent />
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
