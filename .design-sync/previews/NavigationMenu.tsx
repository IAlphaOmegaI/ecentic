import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIcon,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@zenncore/web";

// NavigationMenu is a horizontal nav bar. The Root opens an item's content
// panel when `defaultValue` matches that Item's `value`. Each Item's Content
// renders into the shared Viewport (inside Popup → Positioner → Portal, which
// NavigationMenuPositioner provides).
export const Open = () => (
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
);
