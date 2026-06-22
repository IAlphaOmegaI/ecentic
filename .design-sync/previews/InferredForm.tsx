import { InferredForm, field } from "@zenncore/web";
import { z } from "zod";

// Schema-driven form built from a field() config. InferredForm wires up
// react-hook-form + validation internally, so it renders standalone. This is
// the store-onboarding "connect" form.
const connectConfig = {
  storeName: field({
    shape: "text",
    validator: z.string().min(1),
    label: "Store name",
    placeholder: "Northwind Outdoors",
  }),
  domain: field({
    shape: "text",
    validator: z.string().min(1),
    label: "Storefront domain",
    placeholder: "northwind.myshopify.com",
    description: "We sync your catalog over the Shopify Admin API.",
  }),
  contactEmail: field({
    shape: "text",
    validator: z.string().email(),
    label: "Contact email",
    placeholder: "ops@northwind.com",
  }),
};

export const ConnectStore = () => (
  <div style={{ width: 360 }}>
    <InferredForm config={connectConfig} onSubmit={() => {}} />
  </div>
);

// A competitor-tracking form mixing text + a select.
const competitorConfig = {
  competitor: field({
    shape: "text",
    validator: z.string().min(1),
    label: "Competitor brand",
    placeholder: "Anker",
  }),
  marketplace: field({
    shape: "select",
    validator: z.enum(["amazon", "walmart", "shopify"]),
    label: "Marketplace",
    placeholder: "Choose marketplace",
    items: { amazon: "Amazon US", walmart: "Walmart", shopify: "Shopify" },
  }),
};

export const TrackCompetitor = () => (
  <div style={{ width: 360 }}>
    <InferredForm config={competitorConfig} onSubmit={() => {}} />
  </div>
);
