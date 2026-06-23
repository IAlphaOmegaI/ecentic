import { SearchIcon } from "@zenncore/icons";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
} from "@zenncore/web";

// A listing-editor formatting bar. ToolbarGroup keeps related actions
// together; a pressed button shows the active state. Column cardMode.
export const ListingEditor = () => (
  <div
    style={{
      width: 560,
      border: "1px solid var(--color-accent-foreground)",
      borderRadius: 8,
      padding: 6,
      background: "var(--color-background)",
    }}
  >
    <Toolbar style={{ display: "flex", alignItems: "center" }}>
      <ToolbarGroup style={{ display: "flex" }}>
        <ToolbarButton style={{ fontWeight: 700 }}>B</ToolbarButton>
        <ToolbarButton style={{ fontStyle: "italic" }}>I</ToolbarButton>
        <ToolbarButton style={{ textDecoration: "underline" }}>U</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator
        style={{
          width: 1,
          alignSelf: "stretch",
          margin: "4px 4px",
          background: "var(--color-accent-foreground)",
        }}
      />
      <ToolbarButton>AI rewrite title</ToolbarButton>
      <ToolbarButton>Add spec</ToolbarButton>
      <ToolbarSeparator
        style={{
          width: 1,
          alignSelf: "stretch",
          margin: "4px 4px",
          background: "var(--color-accent-foreground)",
        }}
      />
      <ToolbarLink
        href="#"
        style={{
          padding: "0 12px",
          fontSize: 14,
          color: "var(--color-primary)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        Preview
      </ToolbarLink>
    </Toolbar>
  </div>
);

// A products-table actions bar with a search input on the right.
export const TableActions = () => (
  <div
    style={{
      width: 560,
      border: "1px solid var(--color-accent-foreground)",
      borderRadius: 8,
      padding: 6,
      background: "var(--color-background)",
    }}
  >
    <Toolbar style={{ display: "flex", alignItems: "center" }}>
      <ToolbarButton>Run simulation</ToolbarButton>
      <ToolbarButton>Add competitor</ToolbarButton>
      <ToolbarButton>Export</ToolbarButton>
      <ToolbarSeparator
        style={{
          width: 1,
          alignSelf: "stretch",
          margin: "4px 4px",
          background: "var(--color-accent-foreground)",
        }}
      />
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid var(--color-accent-foreground)",
          borderRadius: 6,
          padding: "0 8px",
          height: 32,
        }}
      >
        <SearchIcon
          style={{
            width: 14,
            height: 14,
            color: "var(--color-foreground-dimmed)",
          }}
        />
        <ToolbarInput
          placeholder="Search products"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: "var(--color-foreground)",
            width: 150,
          }}
        />
      </div>
    </Toolbar>
  </div>
);
