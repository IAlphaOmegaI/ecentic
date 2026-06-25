import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@zenncore/web";

// DropdownMenu is a Base UI Menu. Rendered open via `defaultOpen` so the
// portalled popup shows inside the card. DropdownMenuContent's default
// surface uses `bg-popover` (a token this DS doesn't define), so the popup
// gets an explicit inline surface here.
export const Open = () => (
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
);
