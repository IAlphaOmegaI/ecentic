# Tabs

Use the shared `@zenncore/web` tabs for compact switches between content views. Dashboard, settings, onboarding, docs and public filter rows share the same rounded container, blue gradient selection, separator, typography and focus behavior.

## Imports

```tsx
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
```

## Standard pattern

```tsx
<Tabs defaultValue="general">
  <div className="overflow-x-auto overscroll-x-contain px-4 py-4 sm:px-6">
    <TabsList aria-label={translate("title")} className="min-w-max">
      <TabsIndicator />
      <Tab value="general" className="text-sm">
        {translate("tabs.general")}
      </Tab>
      <Tab value="advanced" className="text-sm">
        {translate("tabs.advanced")}
      </Tab>
    </TabsList>
  </div>
  <TabsPanel value="general">{generalContent}</TabsPanel>
  <TabsPanel value="advanced">{advancedContent}</TabsPanel>
</Tabs>
```

- Include **one `TabsIndicator` per list**. The package supplies the active blue gradient, subtle inset highlight and transition.
- Keep the default `rounded-lg` container. Do not replace compact tabs with custom underline bars, pill buttons, selected backgrounds or per-tab color palettes.
- Add `gap-2` to a `Tab` for an icon. Icons inherit its foreground, including the selected state.
- Keep long tab sets on one horizontal row inside an overflow container. `min-w-max` lets the row scroll locally without squeezing labels or overflowing the page. Do not wrap a shared sliding indicator across multiple rows.
- The default height is `h-9`. Allow extra height only when the content needs it, such as long localized labels; do not use a distinct tab style for each page.
- Content panels remain edge-aligned to their section. Padding around a compact control does not justify padding an entire table, chart or content surface inside another card.
- Use genuine links for navigation between routes; use Tabs for switching views in the same route. They are not interchangeable.

## API and interaction

All primitives forward the corresponding Base UI Tabs props.

| Component | Purpose |
| --- | --- |
| `Tabs` | Root. Supports `defaultValue`, controlled `value` / `onValueChange`, and `orientation`. |
| `TabsList` | Tablist. Provide a meaningful localized `aria-label`. `activateOnFocus` controls whether keyboard focus activates a tab. |
| `Tab` | Button with a required `value`; supports `disabled`. |
| `TabsIndicator` | Active-tab geometry and gradient supplied by the package. |
| `TabsPanel` | Content matching a `value`; `keepMounted` preserves state for expensive panels when needed. |

Base UI owns roving focus, arrow-key movement, activation, and tab/panel associations. Avoid adding custom key handlers or hand-written ARIA selection state. The indicator transitions only its geometry and respects `prefers-reduced-motion`.

## Deliberate visual exceptions

Some public illustrations use Tabs semantics for a large connected roadmap, a full-width scene selector, a file illustration grid, or a provider rail. Those are part of the illustrated page composition and retain their approved art-directed layout. Their nested **compact** filter rows still use the standard pattern above. Exact external ChatGPT/Google preview chrome follows the relevant provider reference, not the ecentic control style.

These exceptions do not apply to ordinary dashboard tabs or a new compact filter row.
