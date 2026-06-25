Toggle from @zenncore/web. Use via `window.ZennWeb.Toggle` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ToggleProps {
  /** Whether the toggle button is currently pressed. This is the controlled counterpart of `defaultPressed`. */
  pressed?: boolean;
  /** Whether the toggle button is currently pressed. This is the uncontrolled counterpart of `pressed`. */
  defaultPressed?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** A unique string that identifies the toggle when used inside a toggle group. */
  value?: string;
  /** Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the */
  nativeButton?: boolean;
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: ToggleState) => string | undefined);
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, ToggleState>;
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: ToggleState) => React.CSSProperties | undefined);
}
```

## Examples

### Pressed

```jsx
() => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Toggle defaultPressed aria-label="Auto-optimize" style={{ borderRadius: 6 }}>
      <BullseyeIcon style={{ width: 16, height: 16 }} />
    </Toggle>
    <span style={{ fontSize: 14, color: "var(--color-foreground)" }}>
      Auto-optimize on
    </span>
  </div>
);

// A toggle group acting as a single-select segmented control — one item
// pre-pressed. Used to switch the dashboard chart between views.
```

### ViewGroup

```jsx
() => (
  <ToggleGroup defaultValue={["winrate"]} style={{ borderRadius: 8 }}>
    <Toggle value="winrate" aria-label="Win rate" style={{ width: 36 }}>
      <BarChartIcon style={{ width: 16, height: 16 }} />
    </Toggle>
    <Toggle value="agents" aria-label="Agents" style={{ width: 36 }}>
      <RobotIcon style={{ width: 16, height: 16 }} />
    </Toggle>
    <Toggle value="radar" aria-label="Radar" style={{ width: 36 }}>
      <RadarIcon style={{ width: 16, height: 16 }} />
    </Toggle>
  </ToggleGroup>
);

// Labeled multi-select group — which agents to include in a simulation.
```

### AgentFilter

```jsx
() => (
  <ToggleGroup
    multiple
    defaultValue={["gpt-4", "claude"]}
    style={{ borderRadius: 8, gap: 2 }}
  >
    <Toggle value="gpt-4" style={{ width: "auto", padding: "0 12px", borderRadius: 6 }}>
      GPT-4
    </Toggle>
    <Toggle value="claude" style={{ width: "auto", padding: "0 12px", borderRadius: 6 }}>
      Claude
    </Toggle>
    <Toggle value="gemini" style={{ width: "auto", padding: "0 12px", borderRadius: 6 }}>
      Gemini
    </Toggle>
  </ToggleGroup>
)
```
