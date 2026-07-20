import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuPositioner,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@zenncore/web";

// ContextMenu is a Base UI ContextMenu — rendered open via `defaultOpen` so
// the portalled popup shows inside the card. ContextMenuPositioner wraps
// Portal + Positioner; ContextMenuPopup holds the items.
export const Open = () => (
  <ContextMenu defaultOpen>
    <ContextMenuTrigger>Right-click a competitor row</ContextMenuTrigger>
    <ContextMenuPositioner>
      <ContextMenuPopup
        style={{
          minWidth: 220,
          borderRadius: 8,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <ContextMenuGroup>
          <ContextMenuGroupLabel
            style={{
              padding: "8px 16px",
              fontSize: 12,
              color: "var(--color-foreground-dimmed)",
            }}
          >
            Anker Soundcore P40i
          </ContextMenuGroupLabel>
          <ContextMenuItem>Compare against my product</ContextMenuItem>
          <ContextMenuItem>View on marketplace</ContextMenuItem>
          <ContextMenuItem>Run simulation</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>
          Track price changes
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Remove competitor</ContextMenuItem>
      </ContextMenuPopup>
    </ContextMenuPositioner>
  </ContextMenu>
);
