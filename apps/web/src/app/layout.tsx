import type { Metadata } from "next";
import { type PropsWithChildren, Suspense } from "react";
import "./globals.css";
import { ToastProvider } from "@zenncore/web/components/toast";
import dynamic from "next/dynamic";
import localFont from "next/font/local";
import Script from "next/script";
import { ToastList } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/theme";

const PostHogProvider = dynamic(() =>
  import("@/context/posthog").then((m) => m.PostHogProvider),
);

const ltsuperior = localFont({
  src: [
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Light.ttf",
      weight: "300",
      style: "light",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Medium.ttf",
      weight: "500",
      style: "medium",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-SemiBold.ttf",
      weight: "600",
      style: "semibold",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Bold.ttf",
      weight: "700",
      style: "bold",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Black.ttf",
      weight: "900",
      style: "black",
    },
  ],
  variable: "--font-ltsuperior",
});

export const metadata: Metadata = {
  title: {
    default: "écentic — Win Every AI Shopping Agent's Cart",
    template: "%s | écentic",
  },
  description:
    "Optimize product listings for AI shopping agents. Simulate GPT-4, Claude, Gemini, and Perplexity decisions, diagnose losses, and improve win rate.",
  keywords: [
    "AI shopping agent optimization",
    "e-commerce AI optimization",
    "AI agent economy",
    "product listing optimization",
    "GPT-4 shopping",
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
  authors: [{ name: "écentic" }],
  creator: "écentic",
  publisher: "écentic",
  metadataBase: new URL("https://ecentic.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ecentic.ai",
    siteName: "écentic",
    title: "écentic — Win Every AI Shopping Agent's Cart",
    description:
      "Simulate how AI shopping agents choose your products, diagnose why they don't, and auto-optimize your listings. Built for the agent economy.",
    images: [
      {
        url: "/images/opengraph.png",
        width: 1200,
        height: 630,
        alt: "écentic — Infrastructure for the Agent Economy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "écentic — Win Every AI Shopping Agent's Cart",
    description:
      "Simulate how GPT-4, Claude, Gemini & Perplexity choose your products vs. competitors. Diagnose losses. Auto-optimize. Win every cart.",
    images: ["/images/opengraph.png"],
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
  manifest: "/manifest.webmanifest",
  other: {
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#1572fa",
    "msapplication-tap-highlight": "no",
  },
  category: "technology",
};

export default ({ children }: PropsWithChildren) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://eu.i.posthog.com" />
        <link
          rel="preconnect"
          href="https://eu-assets.i.posthog.com"
          crossOrigin="anonymous"
        />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <meta name="apple-mobile-web-app-title" content="écentic" />
      </head>
      <body
        className={`${ltsuperior.variable} overflow-x-hidden bg-background font-body tracking-[-4%] antialiased`}
      >
        <Suspense>
          <PostHogProvider>
            <ThemeProvider>
              <ToastProvider>
                <div className="isolate">{children}</div>
                <ToastList types={["error", "success", "info"]} />
              </ToastProvider>
            </ThemeProvider>
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
};
