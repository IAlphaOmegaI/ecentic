import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web";

// Select is an overlay (trigger -> popup listbox). cfg.overrides.Select pins
// cardMode "single" + a viewport so the portalled popup renders inside the
// card. Rendered open via `defaultOpen` so the listbox shows. Popup nests
// inside Positioner. SelectItem text needs a value; SelectValue renders the
// chosen label in the trigger.
const popupStyle = {
  background: "var(--color-background-rich)",
  minWidth: 240,
  borderRadius: 8,
  padding: "4px 0",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
};

export const Open = () => (
  <div style={{ width: 280 }}>
    <Select defaultValue="claude" defaultOpen>
      <SelectTrigger style={{ width: 280 }}>
        <SelectValue />
      </SelectTrigger>
      <SelectPositioner>
        <SelectPopup style={popupStyle}>
          <SelectItem value="gpt4">GPT-4</SelectItem>
          <SelectItem value="claude">Claude</SelectItem>
          <SelectItem value="gemini">Gemini</SelectItem>
          <SelectItem value="perplexity">Perplexity</SelectItem>
        </SelectPopup>
      </SelectPositioner>
    </Select>
  </div>
);

export const Grouped = () => (
  <div style={{ width: 280 }}>
    <Select defaultValue="shopify" defaultOpen>
      <SelectTrigger style={{ width: 280 }}>
        <SelectValue />
      </SelectTrigger>
      <SelectPositioner>
        <SelectPopup style={popupStyle}>
          <SelectGroup>
            <SelectGroupLabel
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--color-foreground-dimmed)",
              }}
            >
              Marketplaces
            </SelectGroupLabel>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
          </SelectGroup>
          <SelectSeparator
            style={{ height: 1, margin: "4px 0", background: "var(--color-accent-foreground)" }}
          />
          <SelectGroup>
            <SelectGroupLabel
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--color-foreground-dimmed)",
              }}
            >
              Feeds
            </SelectGroupLabel>
            <SelectItem value="google">Google Shopping</SelectItem>
            <SelectItem value="custom">Custom XML/JSON</SelectItem>
          </SelectGroup>
        </SelectPopup>
      </SelectPositioner>
    </Select>
  </div>
);

// Closed trigger showing the resting state and the selected value.
export const Closed = () => (
  <div style={{ width: 280 }}>
    <Select defaultValue="weekly">
      <SelectTrigger style={{ width: 280 }}>
        <SelectValue />
      </SelectTrigger>
      <SelectPositioner>
        <SelectPopup style={popupStyle}>
          <SelectItem value="daily">Daily scan</SelectItem>
          <SelectItem value="weekly">Weekly scan</SelectItem>
          <SelectItem value="monthly">Monthly scan</SelectItem>
        </SelectPopup>
      </SelectPositioner>
    </Select>
  </div>
);
