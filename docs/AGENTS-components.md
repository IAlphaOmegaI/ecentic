# Component Patterns

React component conventions for this codebase.

---

## 10. Namespace + Component Pattern

When building React components with associated types, use a namespace to colocate `Props`, `State`, and other types with the component.

```ts
// ✅ Good — from Button.tsx
export const Button = ({
  variant = "default",
  color = "primary",
  className,
  ...props
}: Button.Props): JSX.Element => {
  // ...
};
export namespace Button {
  export type Props = RenderComponentProps<...> & VariantProps<typeof buttonVariants>;
  export type State = ButtonPrimitive.State;
}

// ✅ Good — from InferredForm
export const InferredForm = <Form extends GenericForm>({
  children,
  config,
  onSubmit,
}: InferredForm.Props<Form>): ReactNode => { ... };
export namespace InferredForm {
  export type Props<Form extends GenericForm> = UseInferredFormParams<Form> & {
    children?: ReactNode;
    onSubmit?: (data: FormEntries<Form>) => void;
  };
}

// ✅ Good — from AuthManager pattern
export namespace AuthManager {
  export type Context = { profile: Profile; user: User };
  export type Props = PropsWithChildren;
}
export const AuthManager = ({ children }: AuthManager.Props) => { ... };
```

---

## 20. Component Export and JSX Style

### 20a. Named Exports for All App Components

Always use named exports for components. Arrow function style, no `function` keyword.

```tsx
// ✅ Good
export const Pricing = () => (
  <section>...</section>
);

export const Features = () => (
  <section>...</section>
);
```

### 20b. Anonymous Default Exports for Next.js Pages and Layouts Only

Next.js `page.tsx` and `layout.tsx` files use anonymous default exports.

```tsx
// ✅ Good — page.tsx
export default () => (
  <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12">
    <Navbar />
    <Hero />
    <Footer />
  </main>
);

// ✅ Good — layout.tsx
export default ({ children }: PropsWithChildren) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
};
```

### 20c. Implicit Returns for JSX-Only Components

If the component body is only a return statement, use implicit return with parens. Use a block body only when there is logic before the return.

```tsx
// ✅ Good — implicit return, JSX-only
export const Navbar = () => (
  <nav>...</nav>
);

// ✅ Good — block body only when there's logic
export const Hero = () => {
  const data = computeSomething();
  return <div>{data}</div>;
};
```

### 20d. Static Data Outside Components

Define static arrays and config objects outside the component with `as const`.

```tsx
// ✅ Good
const tiers = [
  { name: "Scan", price: "Free", highlighted: false },
  { name: "Dominate", price: 449, highlighted: true },
] as const;

export const Pricing = () => (
  <section>
    {tiers.map((tier, index) => (
      <div key={index}>{tier.name}</div>
    ))}
  </section>
);
```

### 20e. Inline Sub-Components for Discriminated Rendering

Define small presentational sub-components inline in the same file (not exported) when they are only used locally.

```tsx
// ✅ Good — StatusCell lives in comparison.tsx, not exported
const StatusCell = ({ status }: { status: Status }) => {
  switch (status) {
    case "yes":
      return <span className="text-blue-600">✓</span>;
    case "partial":
      return <span className="text-sm text-zinc-400">Partial</span>;
    case "no":
      return <span className="text-zinc-300">—</span>;
  }
};
```

---

## 23. Context Pattern

Use `createContext` from `@zenncore/utils/hooks` for all React context creation. It auto-throws a descriptive error when the context is consumed outside its provider.

```ts
import { createContext } from "@zenncore/utils/hooks";

type ThemeContext = [theme: Theme, setTheme: SetTheme, env: { isPending: boolean }];

const [ThemeContext, useTheme] = createContext<ThemeContext>({
  name: "Theme",
  // or provide a custom error message:
  error: "useTheme must be used within a ThemeProvider",
});

// Provider
export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const context = useMemo(() => [theme, handleThemeChange, environment] as ThemeContext, [...]);
  return <ThemeContext value={context}>{children}</ThemeContext>;
};

// Consumer
export { useTheme };
```

---

## 24. SSR-Safe DOM Access

Never access `document` or `window` directly in component bodies. Use the `useDocument` hook for safe access.

```ts
// ✅ Good
import { useDocument } from "@/hooks/use-document";

const { document, window } = useDocument();

useEffect(() => {
  if (!window) return;
  // safe to use window here
}, [window]);

// ❌ Bad — crashes on server
const media = window.matchMedia("(prefers-color-scheme: dark)");
```
