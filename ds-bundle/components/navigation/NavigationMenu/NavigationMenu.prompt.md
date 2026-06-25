NavigationMenu from @zenncore/web. Use via `window.ZennWeb.NavigationMenu` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface NavigationMenuProps {
  /** A ref to imperative actions. */
  actionsRef?: RefObject<NavigationMenuRootActions>;
  /** The controlled value of the navigation menu item that should be currently open. When non-nullish, the menu will be open. */
  value?: unknown;
  /** The uncontrolled value of the item that should be initially selected. To render a controlled navigation menu, use the `v */
  defaultValue?: unknown;
  /** How long to wait before opening the navigation popup. Specified in milliseconds. */
  delay?: number;
  /** How long to wait before closing the navigation popup. Specified in milliseconds. */
  closeDelay?: number;
  /** The orientation of the navigation menu. */
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: NavigationMenuRootState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, NavigationMenuRootState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: NavigationMenuRootState) => React.CSSProperties | undefined);
}
```

## Examples

### Open

```jsx
() => (
  <NavigationMenu defaultValue="product">
    <NavigationMenuList>
      <NavigationMenuItem value="product">
        <NavigationMenuTrigger>
          Product
          <NavigationMenuIcon />
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              margin: 0,
              padding: 0,
              listStyle: "none",
              minWidth: 420,
            }}
          >
            <li>
              <NavigationMenuLink href="#">
                <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Simulations</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-foreground-dimmed)" }}>
                  See how GPT-4, Claude, Gemini and Perplexity rank you.
                </p>
              </NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">
                <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Listing optimizer</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-foreground-dimmed)" }}>
                  Auto-rewrite titles and bullets to lift win rate.
                </p>
              </NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">
                <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Competitor tracking</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-foreground-dimmed)" }}>
                  Monitor rivals across marketplaces.
                </p>
              </NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">
                <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Agent analytics</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-foreground-dimmed)" }}>
                  Track AI shopping-agent traffic to your listings.
                </p>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>

      <NavigationMenuItem value="resources">
        <NavigationMenuTrigger>
          Resources
          <NavigationMenuIcon />
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", minWidth: 260 }}>
            <li>
              <NavigationMenuLink href="#">Docs</NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">UCP guide</NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">Blog</NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>

      <NavigationMenuItem value="pricing">
        <NavigationMenuLink href="#">Pricing</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>

    <NavigationMenuPositioner>
      <NavigationMenuPopup
        style={{
          borderRadius: 8,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <NavigationMenuViewport />
      </NavigationMenuPopup>
    </NavigationMenuPositioner>
  </NavigationMenu>
)
```
