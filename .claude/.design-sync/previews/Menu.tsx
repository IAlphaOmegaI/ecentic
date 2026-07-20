import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@zenncore/web";

// Menu is a Base UI Menu — rendered open via `defaultOpen` so the portalled
// popup shows inside the card. MenuPositioner wraps Portal + Positioner;
// MenuPopup holds the items. Radio group shows the selected indicator.
export const Open = () => (
  <Menu defaultOpen>
    <MenuTrigger>Export</MenuTrigger>
    <MenuPositioner>
      <MenuPopup
        style={{
          minWidth: 220,
          borderRadius: 8,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <MenuGroup>
          <MenuGroupLabel>Export simulation report</MenuGroupLabel>
          <MenuItem>Download as CSV</MenuItem>
          <MenuItem>Download as PDF</MenuItem>
          <MenuItem>Copy share link</MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuRadioGroup defaultValue="weekly">
          <MenuGroupLabel>Digest frequency</MenuGroupLabel>
          <MenuRadioItem value="daily">Daily</MenuRadioItem>
          <MenuRadioItem value="weekly">Weekly</MenuRadioItem>
          <MenuRadioItem value="monthly">Monthly</MenuRadioItem>
        </MenuRadioGroup>
      </MenuPopup>
    </MenuPositioner>
  </Menu>
);
