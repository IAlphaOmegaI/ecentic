# Command

Searchable keyboard navigation built on cmdk, exported by `@zenncore/web/components/command`.

Compose `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandEmpty` and `CommandSeparator`. `CommandDialog` is available for modal commands; use package `Popover` for a search anchored to an existing field.

- `Command` accepts `label`, `loop`, `shouldFilter` and the primitive command props. Use `shouldFilter={false}` only when the consumer supplies filtered results.
- `CommandInput` accepts `value`, `onValueChange`, `ref`, `placeholder`, `aria-label` and native command input props. Its optional `classList` keys are `root`, `field`, and `icon`; these style the existing input shell without adding another framed wrapper.
- `CommandGroup` accepts `heading`; `CommandItem` accepts a unique `value`, `disabled` and `onSelect`. Selection is shared between pointer and keyboard; Enter runs `onSelect`.
- cmdk writes boolean-valued data attributes. Style `data-[selected=true]` and `data-[disabled=true]`, never attribute-presence selectors, or every result receives the selected style.
- `CommandShortcut` holds a trailing price, key or navigation indicator. Do not invent a second keyboard-selection implementation.
- Keep loading distinct from no matches. Use localized labels and an accessible search name. Preserve a bounded scrolling result list, focus return on dismissal and an opaque surface.

Dashboard commands use a charcoal Popover anchored to the top-bar field, without a backdrop. Opening shows canonical navigation. After typing, a debounced authenticated action searches the entire owned catalog by title/SKU and competing offers by title/brand, then limits the displayed matches. Never filter a preview of the first ten records. Hide stale matches when the query changes and distinguish request failures from zero matches with a retry action. Existing product prices are displayed only with their known currency; unverified competitor prices are omitted.
