InputOTP from @zenncore/web. Use via `window.ZennWeb.InputOTP` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InputOTPProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  value?: string;
  maxLength: number;
  textAlign?: "center" | "left" | "right";
  pushPasswordManagerStrategy?: "none" | "increase-width";
  pasteTransformer?: (pasted: string) => string;
  containerClassName?: string;
  noScriptCSSFallback?: string;
  render?: (props: RenderProps) => React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  classList?: { root?: string; input?: string; };
  onValueChange: (value: string) => void;
}
```

## Examples

### SixDigit

```jsx
() => (
  <Field label="Verify your store">
    <InputOTP maxLength={6} value="284913" onValueChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  </Field>
)
```

### Grouped

```jsx
() => (
  <Field label="Confirmation code">
    <InputOTP maxLength={6} value="052" onValueChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  </Field>
)
```

### Empty

```jsx
() => (
  <Field label="Enter the code we emailed you">
    <InputOTP maxLength={4} value="" onValueChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  </Field>
)
```
