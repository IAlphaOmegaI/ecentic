import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePositioner,
} from "@zenncore/web";

// Autocomplete is a free-text searchable overlay (input -> suggestion list).
// cfg.overrides.Autocomplete pins cardMode "single" + a viewport so the
// portalled popup renders inside the card. Rendered open via `defaultOpen`.
// The DS styles Autocomplete with literal gray/canvas colors, so we override
// the popup/input/items with brand tokens inline for an on-theme card.
const inputStyle = {
  width: 320,
  background: "var(--color-background)",
  borderColor: "var(--color-accent-foreground)",
  color: "var(--color-foreground)",
};

const popupStyle = {
  width: 320,
  background: "var(--color-background-rich)",
  borderRadius: 8,
  outline: "none",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  color: "var(--color-foreground)",
};

const itemStyle = { color: "var(--color-foreground)" };

const queries = [
  "best wireless earbuds under $150",
  "noise cancelling earbuds for travel",
  "earbuds with longest battery life",
  "waterproof earbuds for running",
  "earbuds compatible with USB-C",
];

const grouped = [
  {
    value: "Products",
    items: ["Wireless Earbuds Pro", "Wireless Earbuds Lite", "Over-Ear Headphones"],
  },
  {
    value: "Competitors",
    items: ["Anker Soundcore", "Bose QuietComfort", "Sony WF-1000XM5"],
  },
];

export const Open = () => (
  <div style={{ width: 320 }}>
    <Autocomplete items={queries} defaultValue="earbuds" defaultOpen>
      <AutocompleteInput placeholder="What would a shopper ask?" style={inputStyle} />
      <AutocompletePositioner>
        <AutocompletePopup style={popupStyle}>
          <AutocompleteEmpty>No suggestions</AutocompleteEmpty>
          <AutocompleteList>
            {(item: string) => (
              <AutocompleteItem key={item} value={item} style={itemStyle}>
                {item}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompletePopup>
      </AutocompletePositioner>
    </Autocomplete>
  </div>
);

export const Grouped = () => (
  <div style={{ width: 320 }}>
    <Autocomplete items={grouped} defaultOpen>
      <AutocompleteInput placeholder="Search catalog & competitors" style={inputStyle} />
      <AutocompletePositioner>
        <AutocompletePopup style={popupStyle}>
          <AutocompleteEmpty>No matches</AutocompleteEmpty>
          <AutocompleteList>
            {(group: { value: string; items: string[] }) => (
              <AutocompleteGroup key={group.value} items={group.items}>
                <AutocompleteGroupLabel
                  style={{ background: "var(--color-background-rich)", color: "var(--color-foreground-dimmed)" }}
                >
                  {group.value}
                </AutocompleteGroupLabel>
                {group.items.map((item) => (
                  <AutocompleteItem key={item} value={item} style={itemStyle}>
                    {item}
                  </AutocompleteItem>
                ))}
              </AutocompleteGroup>
            )}
          </AutocompleteList>
        </AutocompletePopup>
      </AutocompletePositioner>
    </Autocomplete>
  </div>
);

// Resting (closed) input.
export const Closed = () => (
  <div style={{ width: 320 }}>
    <Autocomplete items={queries} defaultValue="noise cancelling">
      <AutocompleteInput placeholder="What would a shopper ask?" style={inputStyle} />
      <AutocompletePositioner>
        <AutocompletePopup style={popupStyle}>
          <AutocompleteList>
            {(item: string) => (
              <AutocompleteItem key={item} value={item} style={itemStyle}>
                {item}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompletePopup>
      </AutocompletePositioner>
    </Autocomplete>
  </div>
);
