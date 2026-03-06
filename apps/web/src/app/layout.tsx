import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import "./globals.css";
import localFont from "next/font/local";
import { ThemeProvider } from "@/context/theme";

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
  title: "écentric — Infrastructure for the Agent Economy",
  description:
    "Simulate how AI shopping agents choose your products, diagnose why they don't, and auto-optimize your listings to win every agent's cart.",
};

export default ({ children }: PropsWithChildren) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ltsuperior.variable} bg-background font-body tracking-[-4%] antialiased`}
      >
        <ThemeProvider>
          <div className="isolate">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
};
