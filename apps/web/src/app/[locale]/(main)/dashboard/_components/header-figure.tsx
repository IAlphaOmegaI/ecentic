import { CustomHairlineFigure } from "@/components/hairline/custom-figure";

const subjects = {
  storeHub: "storefront",
  overview: "overview-console",
  products: "document-stack",
  productDetail: "product-label",
  addProducts: "import-chute",
  quality: "readiness-scanner",
  optimize: "repair-tools",
  research: "research-telescope",
  simulations: "comparison-stand",
  questions: "question-cards",
  brand: "brand-megaphone",
  competitors: "rivals-balance",
  addCompetitors: "target-finder",
  catalogRank: "shelf-ladder",
  channels: "channel-plug-hub",
  visibility: "feed-beacon",
  googleShopping: "merchant-folio",
  agentic: "agent-test-gauge",
  ucp: "checkout-till",
  ucpPlayground: "checkout-workbench",
  ucpComparison: "checkout-lanes",
  webmcp: "browser-toolbench",
  results: "analytics-recorder",
  reports: "report-printer",
  settings: "settings-gears",
} as const satisfies Record<string, CustomHairlineFigure.Props["name"]>;

type Props = {
  subject: keyof typeof subjects;
  surface?: CustomHairlineFigure.Props["surface"];
};

/** Route names own the subject mapping; page headings name the decorative artwork. */
export const DashboardHeaderFigure = ({
  subject,
  surface = "background",
}: Props) => (
  <div
    aria-hidden
    className="flex size-16 shrink-0 items-center justify-center sm:size-20"
  >
    <CustomHairlineFigure
      name={subjects[subject]}
      label=""
      surface={surface}
      className="bg-transparent"
    />
  </div>
);
