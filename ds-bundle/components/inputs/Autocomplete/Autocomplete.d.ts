import * as React from "react";

/**
 * Autocomplete — from @zenncore/web@0.0.0.
 */
export interface AutocompleteProps {
  /** Determines if the popup enters a modal state when open. - `true`: user interaction is limited to the popup: document pag */
  modal?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the autocomplete. Call this after any externally controlled  */
  actionsRef?: RefObject<AutocompleteRootActions>;
  /** Whether the popup is currently open. Use when controlled. */
  open?: boolean;
  /** Whether the popup is initially open. To render a controlled popup, use the `open` prop instead. */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** The uncontrolled input value of the autocomplete when it's initially rendered. To render a controlled autocomplete, use  */
  defaultValue?: string | number | readonly string[];
  /** Identifies the form that owns the internal input. Useful when the combobox is rendered outside the form. */
  form?: string;
  /** Filter function used to match items vs input query. */
  filter?: (
    itemValue: Items[number]["items"][number],
    query: string,
    itemToString?: (itemValue: Items[number]["items"][number]) => string,
  ) => boolean;
  /** The id of the component. */
  id?: string;
  /** When the item values are objects (`<Autocomplete.Item value={object}>`), this function converts the object value to a st */
  itemToStringValue?: (itemValue: Items[number]["items"][number]) => string;
  /** Whether the list is rendered inline without using the component's own popup. Specify `open` unconditionally in conjuncti */
  inline?: boolean;
  /** Whether the first matching item is highlighted automatically. - `true`: highlight after the user types and keep the high */
  autoHighlight?: boolean | "always";
  /** Whether the highlighted item should be preserved when the pointer leaves the list. */
  keepHighlight?: boolean;
  /** Whether moving the pointer over items should highlight them. Disabling this prop allows CSS `:hover` to be differentiate */
  highlightItemOnHover?: boolean;
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
  /** Whether clicking an item should submit the autocomplete's owning form. By default, clicking an item via a pointer or <kb */
  submitOnItemClick?: boolean;
  /** Controls how the autocomplete behaves with respect to list filtering and inline autocompletion. - `list` (default): item */
  mode?: "none" | "inline" | "list" | "both";
  /** The input value of the autocomplete. Use when controlled. */
  value?: string | number | readonly string[];
  /** The items to be displayed in the list. Can be either a flat array of items or an array of groups with items. */
  items: Items;
}

export declare const Autocomplete: React.ComponentType<AutocompleteProps>;
