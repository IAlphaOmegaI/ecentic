Command from @zenncore/web. Use via `window.ZennWeb.Command` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CommandProps {
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  asChild?: boolean;
  /** Accessible label for this command menu. Not shown visibly. */
  label?: string;
  /** Optionally set to `false` to turn off the automatic filtering and sorting. If `false`, you must conditionally render val */
  shouldFilter?: boolean;
  /** Custom filter function for whether each command menu item should matches the given search query. It should return a numb */
  filter?: (value: string, search: string, keywords?: string[]) => number;
  /** Optional controlled state of the selected command menu item. */
  value?: string;
  /** Optionally set to `true` to turn on looping around when using the arrow keys. */
  loop?: boolean;
  /** Optionally set to `true` to disable selection via pointer events. */
  disablePointerSelection?: boolean;
  /** Set to `false` to disable ctrl+n/j/p/k shortcuts. Defaults to `true`. */
  vimBindings?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### Palette

```jsx
() => (
  <div
    style={{
      width: 460,
      height: 360,
      borderRadius: 12,
      boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      overflow: "hidden",
    }}
  >
    <Command>
      <CommandInput placeholder="Search products, competitors, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem>
            Run simulation
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem>
            Optimize listing
            <CommandShortcut>⌘O</CommandShortcut>
          </CommandItem>
          <CommandItem>
            Add competitor
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Products">
          <CommandItem>Wireless Earbuds Pro</CommandItem>
          <CommandItem>Smart Fitness Band X2</CommandItem>
          <CommandItem>Noise-Cancelling Headphones</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Reports">
          <CommandItem>GPT-4 win-rate report</CommandItem>
          <CommandItem>Perplexity visibility report</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
)
```
