Avatar from @zenncore/web. Use via `window.ZennWeb.Avatar` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AvatarProps {
  children?: React.ReactNode;
  /** CSS class applied to the element, or a function that returns a class based on the component's state. */
  className?: string | ((state: AvatarRootState) => string | undefined);
  /** Style applied to the element, or a function that returns a style object based on the component's state. */
  style?: CSSProperties | ((state: AvatarRootState) => React.CSSProperties | undefined);
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps, AvatarRootState>;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Examples

### WithImage

```jsx
() => (
  <Cell label="Store owner">
    <Avatar className="size-12">
      <AvatarImage
        src="https://i.pravatar.cc/96?img=12"
        alt="Mara Ellison"
      />
      <AvatarFallback>ME</AvatarFallback>
    </Avatar>
  </Cell>
);

// Initials fallback — no src, so the fallback renders immediately.
```

### Fallback

```jsx
() => (
  <Cell label="Competitor brand">
    <Avatar className="size-12">
      <AvatarFallback>AP</AvatarFallback>
    </Avatar>
  </Cell>
);

// Small square avatar as used in the product-catalog table rows.
```

### ProductThumb

```jsx
() => (
  <Cell label="AcousticPro X3">
    <Avatar className="size-9 rounded-md bg-background-dimmed">
      <AvatarFallback>AX</AvatarFallback>
    </Avatar>
  </Cell>
)
```
