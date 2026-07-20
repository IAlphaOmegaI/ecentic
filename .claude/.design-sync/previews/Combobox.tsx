import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPositioner,
  ComboboxTrigger,
  ComboboxValue,
} from "@zenncore/web";

// Combobox is a searchable overlay (input -> popup listbox). cfg.overrides.
// Combobox pins cardMode "single" + a viewport so the portalled popup renders
// inside the card. Rendered open via `defaultOpen`. The Root takes an `items`
// array; ComboboxList uses a render-prop to map each item to a ComboboxItem.
const popupStyle = {
  background: "var(--color-background-rich)",
  borderRadius: 8,
  padding: "4px 0",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
};

const competitors = [
  "Anker Soundcore",
  "Bose QuietComfort",
  "Sony WF-1000XM5",
  "Jabra Elite",
  "Sennheiser Momentum",
];

const marketplaces = ["Shopify", "Amazon", "Walmart", "Etsy", "eBay"];

export const Open = () => (
  <div style={{ width: 320 }}>
    <Combobox items={competitors} defaultValue="Sony WF-1000XM5" defaultOpen>
      <div style={{ position: "relative", width: 320 }}>
        <ComboboxInput
          placeholder="Search competitors..."
          style={{ width: 320 }}
        />
        <ComboboxTrigger
          aria-label="Open"
          style={{ position: "absolute", right: 0, top: 0 }}
        />
      </div>
      <ComboboxPositioner>
        <ComboboxPopup style={popupStyle}>
          <ComboboxEmpty>No competitors found</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                <span style={{ gridColumn: "2" }}>{item}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </ComboboxPositioner>
    </Combobox>
  </div>
);

// Multi-select with chips for the selected values.
export const MultiSelect = () => (
  <div style={{ width: 360 }}>
    <Combobox
      items={marketplaces}
      multiple
      defaultValue={["Shopify", "Amazon"]}
      defaultOpen
    >
      <ComboboxChips style={{ width: 360 }}>
        <ComboboxValue>
          {(value: string[]) =>
            value.map((marketplace) => (
              <ComboboxChip key={marketplace}>
                {marketplace}
                <ComboboxChipRemove />
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxInput placeholder="Add marketplace..." />
      </ComboboxChips>
      <ComboboxPositioner>
        <ComboboxPopup style={popupStyle}>
          <ComboboxEmpty>No marketplaces found</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                <span style={{ gridColumn: "2" }}>{item}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </ComboboxPositioner>
    </Combobox>
  </div>
);

// Resting (closed) single-select input.
export const Closed = () => (
  <div style={{ width: 320 }}>
    <Combobox items={competitors} defaultValue="Anker Soundcore">
      <div style={{ position: "relative", width: 320 }}>
        <ComboboxInput
          placeholder="Search competitors..."
          style={{ width: 320 }}
        />
        <ComboboxTrigger
          aria-label="Open"
          style={{ position: "absolute", right: 0, top: 0 }}
        />
      </div>
      <ComboboxPositioner>
        <ComboboxPopup style={popupStyle}>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                <span style={{ gridColumn: "2" }}>{item}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </ComboboxPositioner>
    </Combobox>
  </div>
);
