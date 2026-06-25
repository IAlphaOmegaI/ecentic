Combobox from @zenncore/web. Use via `window.ZennWeb.Combobox` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ComboboxProps {
  /** Determines if the popup enters a modal state when open. - `true`: user interaction is limited to the popup: document pag */
  modal?: boolean;
  /** Whether the popup is currently open. Use when controlled. */
  open?: boolean;
  /** Whether the popup is initially open. To render a controlled popup, use the `open` prop instead. */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** Identifies the form that owns the internal input. Useful when the combobox is rendered outside the form. */
  form?: string;
  /** Filter function used to match items vs input query. */
  filter?: (itemValue: Value, query: string, itemToString?: (itemValue: Value) => string) => boolean;
  /** The id of the component. */
  id?: string;
  /** The items to be displayed in the list. Can be either a flat array of items or an array of groups with items. */
  items?: readonly any[] | readonly Group<any>[];
  /** The input value of the combobox. Use when controlled. */
  inputValue?: string | number | readonly string[];
  /** The uncontrolled input value when initially rendered. To render a controlled input, use the `inputValue` prop instead. */
  defaultInputValue?: string | number | readonly string[];
  /** Whether the list is rendered inline without using the component's own popup. Specify `open` unconditionally in conjuncti */
  inline?: boolean;
  /** Whether the popup opens when clicking the input. */
  openOnInputClick?: boolean;
  /** Identifies the field when a form is submitted. */
  name?: string;
  /** Whether the user must choose a value before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to choose a different option from the popup. */
  readOnly?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Whether to loop keyboard focus back to the input when the end of the list is reached while using the arrow keys. The fir */
  loopFocus?: boolean;
  /** A ref to the hidden input element. */
  inputRef?: React.Ref;
  /** Whether list items are presented in a grid layout. When enabled, arrow keys navigate across rows and columns inferred fr */
  grid?: boolean;
  /** Filtered items to display in the list. When provided, the list will use these items instead of filtering the `items` pro */
  filteredItems?: readonly any[] | readonly Group<any>[];
  /** Whether the items are being externally virtualized. */
  virtualized?: boolean;
  /** The maximum number of items to display in the list. */
  limit?: number;
  /** The locale to use for string comparison. Defaults to the user's runtime locale. */
  locale?: string | Intl.Locale | readonly (string | Intl.Locale)[];
  /** Whether multiple items can be selected. */
  multiple?: Multiple;
  /** Provides a hint to the browser for autofill. */
  autoComplete?: string;
  /** Whether the first matching item is highlighted automatically while filtering. */
  autoHighlight?: boolean;
  /** Whether moving the pointer over items should highlight them. Disabling this prop allows CSS `:hover` to be differentiate */
  highlightItemOnHover?: boolean;
  /** When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string */
  itemToStringLabel?: (itemValue: Value) => string;
  /** When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string */
  itemToStringValue?: (itemValue: Value) => string;
  /** Custom comparison logic used to determine if a combobox item value matches the current selected value. Useful when item  */
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  /** The uncontrolled selected value of the combobox when it's initially rendered. To render a controlled combobox, use the ` */
  defaultValue?: Multiple extends true ? Value[] : Value;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the combobox. Call this after any externally controlled clos */
  actionsRef?: RefObject<AriaCombobox.Actions>;
  /** The selected value of the combobox. Use when controlled. */
  value?: Multiple extends true ? Value[] : Value;
}
```

## Examples

### Open

```jsx
() => (
  <div style={{ width: 320 }}>
    <Combobox items={competitors} defaultValue="Sony WF-1000XM5" defaultOpen>
      <div style={{ position: "relative", width: 320 }}>
        <ComboboxInput placeholder="Search competitors..." style={{ width: 320 }} />
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
```

### MultiSelect

```jsx
() => (
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
```

### Closed

```jsx
() => (
  <div style={{ width: 320 }}>
    <Combobox items={competitors} defaultValue="Anker Soundcore">
      <div style={{ position: "relative", width: 320 }}>
        <ComboboxInput placeholder="Search competitors..." style={{ width: 320 }} />
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
)
```
