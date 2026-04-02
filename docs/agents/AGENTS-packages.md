# @zenncore Package Usage

Always reach for `@zenncore` internal packages before installing external ones.

---

## 22a. Icons — `@zenncore/icons`

All icons are named `[Name]Icon` and imported from `@zenncore/icons`. Used as standard JSX elements with Tailwind sizing.

```tsx
import { CheckIcon, CheckBadgeIcon, CursorGrowIcon } from "@zenncore/icons";

// Usage
<CheckIcon className="size-4 text-primary" />
<CheckBadgeIcon className={cn(feature.color, "size-16")} />
```

Always verify an icon exists before importing — do not assume icons from other libraries exist here (e.g. `XMarkIcon` does not exist — use `XIcon`).

---

## 22b. Utilities — `@zenncore/utils`

```ts
import { cn, cva, type VariantProps, type ClassList } from "@zenncore/utils";
import { resultify, type Result } from "@zenncore/utils";
import type { Nullable, Prettify, DistributiveOmit } from "@zenncore/utils/types";
```

- `cn(...)` — Tailwind class merging (clsx + tailwind-merge)
- `cva(...)` — class variance authority for variant-based components
- `ClassList<K>` — type for `classList` prop (targeted sub-element styling)
- `resultify(fn)` — wraps sync/async function in `Result<T, E>`
- `type Result<T, E>` — `{ success: true; data: T } | { success: false; error: E }`

---

## 22c. Hooks — `@zenncore/utils/hooks`

```ts
import { createContext } from "@zenncore/utils/hooks";
import { useAsyncAction } from "@zenncore/utils/hooks";
```

**`createContext`** — wraps React's `createContext` with auto-error-on-undefined. Returns `[Context, useContextHook]`.

```ts
const [ThemeContext, useTheme] = createContext<ThemeContext>({
  name: "Theme",
  // or provide a custom error message:
  error: "useTheme must be used within a ThemeProvider",
});
```

**`useAsyncAction`** — wraps an async action with `isPending` state tracking. Returns `[handledAction, isPending]`.

```ts
const [submit, isPending] = useAsyncAction(async (data: FormData) => {
  const result = await resultify(() => createItem(data));
  if (!result.success) return;
  router.push("/dashboard");
});
```

---

## 22d. InferredForm — `@zenncore/web/components`

Use `InferredForm` for all forms. Never build raw `react-hook-form` forms from scratch.

```tsx
import {
  InferredForm,
  field,
  applyFormOptions,
} from "@zenncore/web/components";
import { z } from "zod";

// Option A: field() helper — direct config
const config = {
  email: field({
    shape: "text",
    validator: z.string().email(),
    label: "Email",
    placeholder: "you@example.com",
  }),
  role: field({
    shape: "select",
    validator: z.enum(["admin", "user"]),
    label: "Role",
  }),
  agreed: field({
    shape: "checkbox",
    validator: z.boolean(),
    label: "I agree to the terms",
  }),
};

<InferredForm
  config={config}
  onSubmit={(data) => console.log(data)}
  onChange={(data, form) => { ... }}
/>

// Option B: applyFormOptions() — schema-driven (preferred when schema is shared)
const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

const config = applyFormOptions(schema, {
  email: { shape: "text", label: "Email" },
  role: { shape: "select", label: "Role" },
});

<InferredForm config={config} onSubmit={(data) => { ... }} />
```

**Field shapes:**
- `"text"` — `z.ZodString`, renders `TextField`
- `"number"` — `z.ZodNumber`, renders `NumberField`
- `"select"` — `z.ZodEnum` / `z.ZodLiteral` / arrays of those, renders `Select`
- `"phone"` — `z.ZodString`, renders `PhoneField` with country combobox
- `"checkbox"` — `z.ZodBoolean`, renders `Checkbox`
- `"file"` — `z.ZodFile` / `z.ZodArray<z.ZodFile>`, renders `FileUpload`
- `"custom"` — any, renders a `Component` prop you provide

**ClassList for InferredForm fields:**

```ts
field({
  shape: "text",
  validator: z.string(),
  label: "Name",
  classList: {
    field: "col-span-2",
    label: "text-primary",
    error: "text-red-600",
    description: "text-xs",
    control: { /* TextField.Props['classList'] */ },
  },
})
```

---

## 22e. DataTable — `@zenncore/web/components`

Use `DataTableProvider` + `DataTable` + `DataTablePagination` for all tables.

```tsx
import {
  DataTable,
  DataTableEmpty,
  DataTableFooter,
  DataTableHeader,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components";
import { type ColumnDef } from "@tanstack/react-table";

type Row = { _id: string; name: string; status: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

export const UsersTable = ({ data }: { data: Row[] }) => (
  <DataTableProvider data={data} columns={columns}>
    <DataTable>
      <DataTableEmpty>No users found.</DataTableEmpty>
    </DataTable>
    <DataTablePagination />
  </DataTableProvider>
);
```

- `DataTableProvider` — wraps data + columns, exposes `useDataTable()` context
- `DataTable` — renders `<Table>` with headers/rows. Accepts `className` and `classList` for `"header-cell"`, `"body-row"`, `"body-cell"`
- `DataTableHeader` / `DataTableFooter` / `DataTableEmpty` — slot components for customization
- `DataTablePagination` — renders pagination controls using `useDataTable()` context

---

## 22f. Button — Use As-Is, No Custom ClassNames

Use `Button` from `@zenncore/web/components` with the provided variants only. Do not pass `className` to override styles — the Button's built-in styles are intentional and complete. For navigation, use `render={<Link href="..." />}` instead of wrapping in an `<a>` tag or custom styling. Do not add `className` to text inside a Button either — it styles its children internally.

```tsx
// ✅ Good — variant-only, no className overrides
<Button variant="ghost" render={<Link href="/dashboard" />}>Go to Dashboard</Button>
<Button variant="outline">Cancel</Button>
<Button>Submit</Button>

// ❌ Bad — custom className overrides the design system
<Button className="px-6 py-3 rounded-full text-sm font-bold">Custom</Button>

// ❌ Bad — manually styled link instead of Button with render
<a href="/dashboard" className="rounded bg-primary px-4 py-2 text-white">Go to Dashboard</a>
```

---

## 22g. UI Primitives — `@zenncore/web/components`

All headless UI is from `@base-ui/react` wrapped and re-exported from `@zenncore/web/components`. Always import from `@zenncore/web/components`, never directly from `@base-ui/react` in app code.

```tsx
import {
  TextField, TextFieldInput, TextFieldMaskToggle,
  Select, SelectTrigger, SelectValue, SelectPositioner, SelectPopup, SelectItem,
  Checkbox,
  PhoneField, PhoneFieldCountryCombobox, PhoneFieldInput,
  NumberField,
  FileUpload, FileUploadInput, FileUploadPreview,
  Button,
  Dialog, DialogTrigger, DialogPopup, DialogTitle, DialogDescription, DialogClose,
  Form, Field, FieldController, FieldLabel, FieldError, FieldDescription,
} from "@zenncore/web/components";
```

---

## 22h. `ClassList` Pattern for Components

Components in `@zenncore/web` expose a `classList` prop for targeted styling of sub-elements instead of wrapping/overriding.

```tsx
<SelectTrigger
  classList={{
    trigger: "border-2 border-primary",
    icon: { root: "opacity-50", icon: "stroke-primary" },
  }}
/>

<DataTable
  classList={{
    "header-cell": "text-primary font-bold",
    "body-row": "hover:bg-primary/5",
    "body-cell": "py-3",
  }}
/>
```

---

## 25. Design Tokens (Tailwind)

Use the semantic design tokens defined in the Tailwind config. Do not use raw color values unless building a one-off UI genuinely outside the design system.

```
text-primary           — primary brand color
text-primary-dimmed    — dimmed variant of primary
text-foreground        — main text
text-foreground-dimmed — secondary/muted text
bg-background          — page background
bg-background-dimmed   — subtle background (cards, sections)
border-accent-foreground — standard border color
text-error             — error state
bg-primary             — primary background (CTAs, highlights)
```

```tsx
// ✅ Good
<p className="font-light text-foreground-dimmed text-lg">{caption}</p>
<div className="border border-accent-foreground">{content}</div>
<button className="bg-primary text-white">Submit</button>

// ❌ Bad — raw colors bypass the design system
<p className="text-gray-400">{caption}</p>
```

---

## 26. Spacing — Always Multiples of 2

Use only multiples of 2 for all spacing values (`gap`, `p`, `px`, `py`, `m`, `mx`, `my`, `space-x`, `space-y`, etc.). The design line grid is based on multiples of 4 and 8 — these create the visual rhythm. Odd values (3, 5, 6, 7) break the grid.

For icons and fixed-size elements, always use `size-4` (not `size-3` or `size-5`). Use `size-8`, `size-16`, etc. for larger icons.

```tsx
// ✅ Good — multiples of 2, grid-aligned
<div className="flex flex-col gap-4 p-8">
  <div className="flex items-center gap-2 px-4 py-2">
    <CheckIcon className="size-4" />
    <span>Label</span>
  </div>
</div>
<div className="m-4 space-y-8">...</div>

// ❌ Bad — odd values break the grid
<div className="flex flex-col gap-3 p-5">
  <div className="flex items-center gap-1.5 px-3 py-1.5">
    <CheckIcon className="size-3" />
  </div>
</div>
```
