Select from @zenncore/web. Use via `window.ZennWeb.Select` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SelectProps {
  children?: React.ReactNode;
  /** A ref to access the hidden input element. */
  inputRef?: React.Ref;
  /** Identifies the field when a form is submitted. */
  name?: string;
  /** Identifies the form that owns the hidden input. Useful when the select is rendered outside the form. */
  form?: string;
  /** Provides a hint to the browser for autofill. */
  autoComplete?: string;
  /** The id of the Select. */
  id?: string;
  /** Whether the user must choose a value before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to choose a different option from the select popup. */
  readOnly?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Whether multiple items can be selected. */
  multiple?: Multiple;
  /** Whether moving the pointer over items should highlight them. Disabling this prop allows CSS `:hover` to be differentiate */
  highlightItemOnHover?: boolean;
  /** Whether the select popup is initially open. To render a controlled select popup, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether the select popup is currently open. */
  open?: boolean;
  /** Determines if the select enters a modal state when open. - `true`: user interaction is limited to the select: document p */
  modal?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the select. Call this after any externally controlled closin */
  actionsRef?: RefObject<SelectRootActions>;
  /** Data structure of the items rendered in the select popup. When specified, `<Select.Value>` renders the label of the sele */
  items?: readonly Group<any>[] | Record<string, ReactNode> | readonly { label: React.ReactNode; value: any; }[];
  /** When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string r */
  itemToStringLabel?: (itemValue: Value) => string;
  /** When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string r */
  itemToStringValue?: (itemValue: Value) => string;
  /** Custom comparison logic used to determine if a select item value matches the current selected value. Useful when item va */
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  /** The uncontrolled value of the select when it's initially rendered. To render a controlled select, use the `value` prop i */
  defaultValue?: Multiple extends true ? Value[] : Value;
  /** The value of the select. Use when controlled. */
  value?: Multiple extends true ? Value[] : Value;
}
```

## Examples

### Open

```jsx
() => (
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
)
```

### Grouped

```jsx
() => (
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
```

### Closed

```jsx
() => (
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
)
```
