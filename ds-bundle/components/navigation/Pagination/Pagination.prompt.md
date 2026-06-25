Pagination from @zenncore/web. Use via `window.ZennWeb.Pagination` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PaginationProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  id?: string;
  /** Allows you to replace the component's HTML element with a different tag, or compose it with another component. Accepts a */
  render?: ReactElement<unknown, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps<any>, EmptyObject>;
  className?: string;
}
```

## Examples

### Pages

```jsx
() => (
  <div style={{ width: 360 }}>
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink>Prev</PaginationLink>
        </PaginationItem>
        <PaginationItem>1</PaginationItem>
        <PaginationItem isActive>2</PaginationItem>
        <PaginationItem>3</PaginationItem>
        <PaginationItem>4</PaginationItem>
        <PaginationItem>
          <PaginationLink>Next</PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
)
```

### FirstPageActive

```jsx
() => (
  <div style={{ width: 320 }}>
    <Pagination>
      <PaginationContent>
        <PaginationItem isActive>1</PaginationItem>
        <PaginationItem>2</PaginationItem>
        <PaginationItem>3</PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
)
```
