import localFont from "next/font/local";

export const superior = localFont({
  src: [
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/LTSuperior/LTSuperior-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-lt-superior",
  display: "swap",
});

export const redHatDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/marketing/RedHatDisplay-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/marketing/RedHatDisplay-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/marketing/RedHatDisplay-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-redhat-display",
  display: "swap",
});
