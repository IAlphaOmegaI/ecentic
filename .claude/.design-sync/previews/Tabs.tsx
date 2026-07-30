import { Tab, Tabs, TabsIndicator, TabsList, TabsPanel } from "@zenncore/web";

// TabsList must contain TabsIndicator — the active Tab's label is white and
// relies on the indicator's colored background to be visible.
export const Horizontal = () => (
  <div style={{ width: 480 }}>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsIndicator />
        <Tab value="overview">Overview</Tab>
        <Tab value="agents">AI Agents</Tab>
        <Tab value="competitors">Competitors</Tab>
      </TabsList>
      <TabsPanel
        value="overview"
        style={{ padding: 16, color: "var(--color-foreground)" }}
      >
        Your product wins 62% of AI shopping-agent comparisons this week.
      </TabsPanel>
      <TabsPanel
        value="agents"
        style={{ padding: 16, color: "var(--color-foreground)" }}
      >
        Simulated across ChatGPT, Claude, Gemini and Perplexity.
      </TabsPanel>
      <TabsPanel
        value="competitors"
        style={{ padding: 16, color: "var(--color-foreground)" }}
      >
        Tracking 8 competitors across 3 marketplaces.
      </TabsPanel>
    </Tabs>
  </div>
);

export const FullWidth = () => (
  <div style={{ width: 480 }}>
    <Tabs defaultValue="auto">
      <TabsList>
        <TabsIndicator />
        <Tab value="auto" style={{ flex: 1 }}>
          Auto-detect
        </Tab>
        <Tab value="url" style={{ flex: 1 }}>
          Paste URLs
        </Tab>
        <Tab value="search" style={{ flex: 1 }}>
          Search brand
        </Tab>
      </TabsList>
      <TabsPanel
        value="auto"
        style={{ padding: 16, color: "var(--color-foreground)" }}
      >
        We detect competitors automatically from your catalog.
      </TabsPanel>
      <TabsPanel
        value="url"
        style={{ padding: 16, color: "var(--color-foreground)" }}
      >
        Paste competitor product URLs to track them directly.
      </TabsPanel>
      <TabsPanel
        value="search"
        style={{ padding: 16, color: "var(--color-foreground)" }}
      >
        Search by brand name to discover competing listings.
      </TabsPanel>
    </Tabs>
  </div>
);
