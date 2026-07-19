# 007 — Expand the Shopify shop-domain sub-form instead of teleporting it in

- **Status**: DONE (applied 2026-07-19; executor-implemented, reviewed, feel check pending)
- **Commit**: 35012a3
- **Severity**: MEDIUM
- **Category**: Missed opportunities (teleporting state on the conversion path)
- **Estimated scope**: 2 files (`sign-in-form.tsx`, `sign-up-form.tsx`), identical edit in each

## Problem

Clicking "Continue with Shopify" instantly inserts the shop-domain sub-form into the middle of the auth button stack — every element below it jumps. Clicking again removes it just as abruptly. This sits on the sign-in/sign-up conversion path.

```tsx
// apps/web/src/app/(auth)/sign-in/_components/sign-in-form.tsx:183-203 — current
        {provider === "shopify" && (
          <InferredForm
            config={shopifyFormConfig}
            onSubmit={(data) => handleSubmit({ data, type: "shopify" })}
            className="flex flex-col gap-2 pt-1"
          >
            <Button
              type="submit"
              color="primary"
              disabled={isPending}
              className="w-full"
            >
              ...
            </Button>
          </InferredForm>
        )}
```

The identical block exists at `apps/web/src/app/(auth)/sign-up/_components/sign-up-form.tsx:209-229`.

Both files currently import only `import { Motion } from "@/components/motion";` — no direct motion imports.

## Target

The sub-form expands from 0 height with a fade and collapses symmetrically, on the repo's standard spring. `Spring.Snappy` = `{ type: "spring", stiffness: 320, damping: 28 }` (`apps/web/src/lib/animations.ts:4`), which settles in ~300ms. The buttons below glide instead of jumping.

```tsx
// imports to add (both files)
import { AnimatePresence, motion } from "motion/react";
import { Spring } from "@/lib/animations";
```

```tsx
// target (both files) — the InferredForm and everything inside it are unchanged
        <AnimatePresence initial={false}>
          {provider === "shopify" && (
            <motion.div
              key="shopify-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={Spring.Snappy}
              style={{ overflow: "hidden" }}
            >
              <InferredForm
                config={shopifyFormConfig}
                onSubmit={(data) => handleSubmit({ data, type: "shopify" })}
                className="flex flex-col gap-2 pt-1"
              >
                ...unchanged children...
              </InferredForm>
            </motion.div>
          )}
        </AnimatePresence>
```

- `initial={false}`: no entrance replay if the page mounts with the sub-form already open, and no animation during the surrounding `Motion.Stagger` mount.
- `style={{ overflow: "hidden" }}` clips the form while height animates; the form's own `pt-1` padding is inside the clipped wrapper, so no padding pop.
- Height is a layout property — accepted here deliberately: this is the standard Motion collapse pattern, the same shape the component library uses for its accordion/collapsible height transitions, and the trigger is occasional.

## Repo conventions to follow

- Springs from `@/lib/animations` — never inline configs.
- The shared library's collapse exemplar (CSS flavor of the same pattern): `packages/web/src/components/collapsible.tsx:48`.
- Do not restructure `InferredForm` usage — forms are always `InferredForm` + config (CLAUDE.md).

## Steps

1. In `sign-in-form.tsx`, add the two imports shown above.
2. Wrap the `{provider === "shopify" && (<InferredForm …/>)}` block (lines 183-203) exactly as shown in Target — `AnimatePresence` outside the conditional, `motion.div` inside it, `InferredForm` untouched within.
3. Repeat both edits in `sign-up-form.tsx` (block at lines 209-229).

## Boundaries

- Do NOT touch the provider toggle buttons, `handleSubmit`, `shopifyFormConfig`, or any other part of either form.
- Do NOT animate the "or" divider or the credential form below.
- Do NOT extract a shared component for the two blocks — mirror the edit; refactoring is out of scope.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline ~74).
- **Feel check**: `bun run dev:web`, open `/sign-in` and `/sign-up`:
  - Click "Continue with Shopify": the sub-form unfolds (~300ms) and the "or" divider + credential form glide down; nothing jumps.
  - Click it again mid-animation: the collapse retargets smoothly from wherever the spring is — no restart from full height (springs are interruptible; this is the point of not using keyframes).
  - Submit inside the expanded form still works; the loading spinner state is unaffected.
  - Initial page load plays the normal stagger with no height animation.
- **Done when**: toggling the Shopify option never causes a single-frame layout jump on either form, including when spammed.
