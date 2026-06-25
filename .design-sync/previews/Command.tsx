import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@zenncore/web";

// Command is a cmdk command palette — renders inline as a searchable list, so
// no "open" state is needed. Command root is `size-full`; the wrapper gives it
// a bounded surface with a border and shadow.
export const Palette = () => (
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
);
