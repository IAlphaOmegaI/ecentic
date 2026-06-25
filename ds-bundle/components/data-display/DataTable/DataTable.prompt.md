DataTable from @zenncore/web. Use via `window.ZennWeb.DataTable` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DataTableProps {
  className?: string;
  classList?: { "header-cell"?: string; "body-row"?: string; "body-cell"?: string; };
  children?: React.ReactNode;
}
```

## Examples

### ProductCatalog

```jsx
() => (
  <div style={{ width: 620 }}>
    <DataTableProvider rows={rows} columns={columns} pageSize={20}>
      <DataTable />
    </DataTableProvider>
  </div>
)
```
