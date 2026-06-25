import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web";

// Rendered with a default-open item so a panel is visible. Accordion is used
// for FAQ-style explainers about how AI shopping agents compare products.
export const FAQ = () => (
  <div style={{ width: 460 }}>
    <Accordion defaultValue={["agents"]}>
      <AccordionItem value="agents">
        <AccordionTrigger>
          How do AI agents compare my products?
        </AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            We simulate GPT-4, Claude, Gemini and Perplexity shopping for your
            category, then score how often each agent recommends your listing
            over the 8 competitors we track.
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="winrate">
        <AccordionTrigger>What is a win rate?</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            The share of agent comparisons your product wins across all tracked
            marketplaces.
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="optimize">
        <AccordionTrigger>How does auto-optimize work?</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            We rewrite titles, specs and descriptions to match what agents cite
            when they pick a winner.
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </div>
);

// Multiple items expanded at once.
export const MultiOpen = () => (
  <div style={{ width: 460 }}>
    <Accordion multiple defaultValue={["shopify", "feed"]}>
      <AccordionItem value="shopify">
        <AccordionTrigger>Shopify</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            Connect via OAuth to sync your catalog automatically.
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="feed">
        <AccordionTrigger>Product feed (XML / JSON)</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            Paste a Google Shopping feed URL and we detect the format for you.
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </div>
);
