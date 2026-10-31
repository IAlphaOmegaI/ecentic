import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { localizePath } from "@/i18n/locale";
import { createMetadata } from "@/lib/seo";
import Art from "@/public/images/ascii/cart.png";
import { ContentPageLayout } from "../_components/content";
import { StoreForm } from "./_components/store-form";

// Hardcoded English tonight, like the internal /dev pages: no shared catalog edits.
export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();

  return createMetadata({
    title: "Get your store ready for AI shopping",
    description:
      "Paste any store URL. ecentic reads your products, fixes what AI channels cannot use, and hands you a Google Merchant Center feed and a ChatGPT feed.",
    path: localizePath("/agents", locale),
  });
};

export default () => (
  <ContentPageLayout
    title="Paste your store."
    accent="We'll get it ready for Google, Gemini and ChatGPT."
    description="We read every product, up to 40, fix what we can from your store's own pages, list what we can't, and hand you both feeds."
    art={{ source: Art, alt: "A shopping cart drawn in ASCII characters" }}
    actions={<StoreForm />}
  >
    {null}
  </ContentPageLayout>
);
