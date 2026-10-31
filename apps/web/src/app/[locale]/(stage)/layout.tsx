import type { PropsWithChildren } from "react";

/**
 * Room screens: full viewport, dark, no navbar, no scrolling. The theme system's
 * `dark` class only drives `dark:` variants, since no token set is defined for
 * it, so the tokens are remapped here and `bg-background`, `text-foreground` and
 * `border-accent-foreground` keep working on the dark surface beneath.
 */
export default ({ children }: PropsWithChildren) => (
  <div className="dark h-dvh overflow-hidden bg-background text-foreground [--color-accent-foreground:var(--color-emphasis-rich)] [--color-background-dimmed:var(--color-emphasis)] [--color-background-rich:var(--color-emphasis-rich)] [--color-background:var(--color-emphasis-dimmed)] [--color-foreground-dimmed:var(--color-accent-rich)] [--color-foreground-rich:var(--color-white)] [--color-foreground:var(--color-white)] [color-scheme:dark]">
    {children}
  </div>
);
