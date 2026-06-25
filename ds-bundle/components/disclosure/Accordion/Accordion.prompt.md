Accordion from @zenncore/web. Use via `window.ZennWeb.Accordion` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AccordionProps {
  /** The controlled value of the item(s) that should be expanded. To render an uncontrolled accordion, use the `defaultValue` */
  value?: AccordionValue<unknown>;
  /** The uncontrolled value of the item(s) that should be initially expanded. To render a controlled accordion, use the `valu */
  defaultValue?: AccordionValue<unknown>;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Allows the browser's built-in page search to find and expand the panel contents. Overrides the `keepMounted` prop and us */
  hiddenUntilFound?: boolean;
  /** Whether to keep the element in the DOM while the panel is closed. This prop is ignored when `hiddenUntilFound` is used. */
  keepMounted?: boolean;
  /** Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434) to remove roving focus.  */
  loopFocus?: boolean;
  /** Whether multiple items can be open at the same time. */
  multiple?: boolean;
  /** Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434) to remove roving focus.  */
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: Accordion$1.Root.State<unknown>) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, Accordion$1.Root.State<unknown>>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: Accordion$1.Root.State<unknown>) => React.CSSProperties | undefined);
}
```

## Examples

### FAQ

```jsx
() => (
  <div style={{ width: 460 }}>
    <Accordion defaultValue={["agents"]}>
      <AccordionItem value="agents">
        <AccordionTrigger>How do AI agents compare my products?</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            We simulate GPT-4, Claude, Gemini and Perplexity shopping for your
            category, then score how often each agent recommends your listing
            over the 8 competitors we track.
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="winrate">
        <AccordionTrigger>What is a win rate?</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            The share of agent comparisons your product wins across all tracked
            marketplaces.
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="optimize">
        <AccordionTrigger>How does auto-optimize work?</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            We rewrite titles, specs and descriptions to match what agents cite
            when they pick a winner.
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </div>
);

// Multiple items expanded at once.
```

### MultiOpen

```jsx
() => (
  <div style={{ width: 460 }}>
    <Accordion multiple defaultValue={["shopify", "feed"]}>
      <AccordionItem value="shopify">
        <AccordionTrigger>Shopify</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            Connect via OAuth to sync your catalog automatically.
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="feed">
        <AccordionTrigger>Product feed (XML / JSON)</AccordionTrigger>
        <AccordionPanel>
          <div style={{ paddingBottom: 12, color: "var(--color-foreground)" }}>
            Paste a Google Shopping feed URL and we detect the format for you.
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </div>
)
```
