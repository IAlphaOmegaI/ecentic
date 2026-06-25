DropdownMenu from @zenncore/web. Use via `window.ZennWeb.DropdownMenu` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DropdownMenuProps {
  /** Whether the menu is initially open. To render a controlled menu, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** Whether to loop keyboard focus back to the first item when the end of the list is reached while using the arrow keys. */
  loopFocus?: boolean;
  /** Whether moving the pointer over items should highlight them. Disabling this prop allows CSS `:hover` to be differentiate */
  highlightItemOnHover?: boolean;
  /** Determines if the menu enters a modal state when open. - `true`: user interaction is limited to the menu: document page  */
  modal?: boolean;
  /** Whether the menu is currently open. */
  open?: boolean;
  /** The visual orientation of the menu. Controls whether roving focus uses up/down or left/right arrow keys. */
  orientation?: "horizontal" | "vertical";
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** When in a submenu, determines whether pressing the Escape key closes the entire menu, or only the current child menu. */
  closeParentOnEsc?: boolean;
  /** A ref to imperative actions. - `unmount`: Manually unmounts the menu. Call this after any externally controlled closing  */
  actionsRef?: RefObject<MenuRootActions>;
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `open` prop to create a co */
  triggerId?: string;
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `defaultOpen` prop to crea */
  defaultTriggerId?: string;
  /** A handle to associate the menu with a trigger. If specified, allows external triggers to control the menu's open state. */
  handle?: Menu.Handle<unknown>;
  /** The content of the popover. This can be a regular React node or a render function that receives the `payload` of the act */
  children?: boolean | PayloadChildRenderFunction<unknown> | React.ReactNode;
}
```

## Examples

### Open

```jsx
() => (
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger>Product actions</DropdownMenuTrigger>
    <DropdownMenuContent
      style={{
        width: 240,
        background: "var(--color-background-rich)",
        color: "var(--color-foreground)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      }}
    >
      <DropdownMenuGroup>
        <DropdownMenuLabel>Wireless Earbuds Pro</DropdownMenuLabel>
        <DropdownMenuItem>
          View report
          <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          Optimize listing
          <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Run simulation</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem checked>
        Track in weekly digest
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
```
