Table from @zenncore/web. Use via `window.ZennWeb.Table` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TableProps {
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

### CompetitorWinRates

```jsx
() => (
  <div style={{ width: 560 }}>
    <Table>
      <TableCaption>Win rate vs. tracked competitors, last 7 days</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Competitor</TableHead>
          <TableHead>Marketplace</TableHead>
          <TableHead>GPT-4</TableHead>
          <TableHead>Claude</TableHead>
          <TableHead>Win Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.marketplace}</TableCell>
            <TableCell>{row.gpt4}%</TableCell>
            <TableCell>{row.claude}%</TableCell>
            <TableCell>{row.win}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Portfolio average</TableCell>
          <TableCell>3 markets</TableCell>
          <TableCell>46%</TableCell>
          <TableCell>46%</TableCell>
          <TableCell>47%</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
)
```
