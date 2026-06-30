# UCP Advanced Validator — Constraint Backlog & Non-Schema Rules

Companion notes for [`ucp-advanced-validator.ts`](./advanced-validator.ts).

This file tracks UCP spec rules (Cart, Checkout, Discount, Buyer Consent,
Fulfillment) against what Zod can actually enforce. Zod validates **one payload
in isolation** — it cannot see prior requests, server/session state, the product
catalog, the negotiated capability profile, or judge what a string *means*. Every
rule below is filed by whether it's:

- **Part A** — expressible in Zod but **not yet implemented** (actionable backlog).
- **Part B** — already enforced (reference, so you don't duplicate).
- **Part C** — **not** expressible in Zod; must be enforced elsewhere.

Conventions in the sketches: `import * as z from "zod"`, refinement context typed
as `z.core.$RefinementCtx`, issues raised with `ctx.addIssue({ code: "custom", path, message })`.

---

## Part A — Expressible, not yet implemented

These need a refine on a **response-level** object (so it can see sibling fields
like `totals` + `line_items`, or `discounts` + `messages`). Ranked by confidence.

### A1. `items_discount` cross-total identity — **high confidence**

> Discount spec, explicit Invariant: `totals[type=items_discount].amount` equals
> `sum(line_items[].totals[type=items_discount].amount)`.

Lives on cart + checkout responses (both carry top-level `totals` and per-line
`line_items[].totals`). Implement as a shared helper and attach via `.superRefine`.

```ts
const refineItemsDiscountIdentity = (
  resource: {
    totals: { type: string; amount: number }[];
    line_items: { totals: { type: string; amount: number }[] }[];
  },
  ctx: z.core.$RefinementCtx,
) => {
  const sumItemsDiscount = (entries: { type: string; amount: number }[]) =>
    entries
      .filter((total) => total.type === "items_discount")
      .reduce((sum, total) => sum + total.amount, 0);

  const topLevel = sumItemsDiscount(resource.totals);
  const perLine = sumItemsDiscount(
    resource.line_items.flatMap((lineItem) => lineItem.totals),
  );

  if (topLevel !== perLine) {
    ctx.addIssue({
      code: "custom",
      path: ["totals"],
      message: `items_discount total (${topLevel}) must equal the sum of line-item items_discount totals (${perLine})`,
    });
  }
};
```

Attach points: the 4 cart response schemas (already carry `.superRefine(refineCartLineItems)`
— chain a second `.superRefine`, or fold both into one helper) and
`checkoutResponseBaseSchema`. No-op when neither side has `items_discount` (both sum to 0).

### A2. Fulfillment `line_item_ids` ⊆ checkout `line_items[].id` — **medium-high**

Structurally implied by the fulfillment spec (methods fulfill cart items). We already
enforce group ⊆ method *within* a method; this ties method/available-method line
items up to the actual checkout line items. Lives on the checkout-with-fulfillment
response (has both `line_items` and `fulfillment`).

```ts
const refineFulfillmentLineItems = (
  checkout: {
    line_items: { id: string }[];
    fulfillment?: {
      methods?: { line_item_ids: string[] }[];
      available_methods?: { line_item_ids: string[] }[];
    };
  },
  ctx: z.core.$RefinementCtx,
) => {
  const known = new Set(checkout.line_items.map((lineItem) => lineItem.id));
  const groups = [
    ["methods", checkout.fulfillment?.methods ?? []] as const,
    ["available_methods", checkout.fulfillment?.available_methods ?? []] as const,
  ];
  for (const [key, entries] of groups) {
    for (const [index, entry] of entries.entries()) {
      for (const lineItemId of entry.line_item_ids) {
        if (!known.has(lineItemId)) {
          ctx.addIssue({
            code: "custom",
            path: ["fulfillment", key, index, "line_item_ids"],
            message: `fulfillment references unknown line item "${lineItemId}"`,
          });
        }
      }
    }
  }
};
```

Attach to `checkoutWithFulfillmentResponseSchema` and
`completeCheckoutWithFulfillmentResponseSchema` (chain after `refineCheckoutConstraints`).

### A3. `ucp.status === "error"` ⟺ `id` absent (create cart response) — **medium**

> Cart spec: "ucp.status is the primary discriminator; the absence of `id` is a
> consistent secondary indicator."

Only `createCartResponseSchema` has `id` optional, so this applies there.

```ts
.superRefine((cart, ctx) => {
  const isError = cart.ucp.status === "error"; // status defaults to success when absent
  if (isError && cart.id !== undefined) {
    ctx.addIssue({ code: "custom", path: ["id"], message: "id must be absent on an error response" });
  }
  if (!isError && cart.id === undefined) {
    ctx.addIssue({ code: "custom", path: ["id"], message: "id is required on a success response" });
  }
});
```

### A4. Rejected discount code → warning message — **low (SHOULD, advisory)**

> Discount spec: rejected codes "communicated via `messages[]`" — but this is a
> **SHOULD**, and messages use freeform codes.

Do **not** make this a hard schema error. If implemented, treat it as advisory:
for each entry in `discounts.codes` not present in `discounts.applied[].code`
(case-insensitive) and with no `messages[]` entry whose `path` is
`$.discounts.codes[i]`, emit at most a soft notice. Lives on the cart/checkout
response (needs both `discounts` and `messages`). Realistically better as a lint
than a validator rule.

### A5. Message `path` JSONPath **syntax** validation — **low value**

> Messages `path` is "RFC 9535 JSONPath".

Zod can validate the string is *syntactically* a JSONPath (regex or a JSONPath
library), but **cannot** verify it resolves to a real node without the full
document + a JSONPath evaluator. Wire into `baseMessageSchema.path` only if syntax
checking is worth the dependency.

### A6. URL origin matches namespace authority — **high (code already drafted)**

The helper `urlOriginMatchesNamespaceAuthority` and the `superRefine` blocks for
`businessServicesSchema` and `capabilitiesSchema` are **already written but
commented out** in the file. To enable: uncomment, confirm the
`spec`/`schema` URL origins must match the reverse-domain authority
(`dev.ucp.*` → `ucp.dev`, `com.example.*` → `example.com`), and re-attach the
`superRefine`s.

### A7. Error Response variant (Checkout / Cart / Order / Catalog / create-*) — **high value, larger refactor**

> Checkout, Cart, Order & Catalog specs: every operation output "MUST be one of: resource
> **or** Error Response." An Error Response carries `ucp.status: "error"` + a non-empty
> `messages` array and **no resource** (no `id`/`line_items`/`totals`/`product`); errors with
> no resource to act on SHOULD use `severity: "unrecoverable"`. Get Order returns this for
> `not_found` / `unauthorized` (see `orderErrorCodeSchema`); `get_product` returns it (no
> `product`) when the identifier is not found. Note: catalog *non-fatal* errors instead ride
> on the success response's `messages[]` with `severity:"recoverable"` (already enforced) —
> the error-response variant is only for the "no resource produced" case.

Today only the success resource is modeled. Define a shared error response and make
the operation outputs discriminated unions:

```ts
const errorResponseSchema = z.object({
  ucp: z.object({ version: versionSchema(), status: z.literal("error") }).loose(),
  messages: z.array(messageSchema).min(1),
  continue_url: httpsUrlSchema.optional(),
});
// then e.g. checkoutOutput = z.union([checkoutResponseSchema, errorResponseSchema])
```

Deferred because it ripples through **every** checkout response schema (plus the
with-fulfillment / discount / consent variants that `.extend` them) and the cart
responses. Do it as its own task; decide whether each `export`ed `*ResponseSchema`
should become the union or whether to add separate `*OutputSchema` unions and leave
the resource schemas intact.

---

## Part B — Already enforced (don't duplicate)

Recently added:

- **Totals**: exactly one `subtotal` + one `total`; **accounting identity**
  (`total` = sum of all other entries); per-entry `lines` sum to parent.
- **Currency**: `/^[A-Z]{3}$/` on cart/checkout/order response `currency` (shared `currencyCodeSchema`).
- **Discount**: `sum(allocations) === amount`; `automatic` ⟹ no `code`; `eligibility` ⟹ `automatic`.
- **Fulfillment**: `fulfillable_on` is `"now" | ISO date/datetime`; each option carries
  a `total`; `selected_option_id`/`selected_destination_id` reference known entries;
  unique option/group/destination IDs; group `line_item_ids` ⊆ method `line_item_ids`;
  `latest >= earliest` fulfillment time.
- **Cart**: line-item IDs unique within a cart; `parent_id` references a known line item.
- **Checkout**: `status === "completed"` ⟹ `order` present; eligibility message-code
  contract (`eligibility_invalid` ⟹ `type: error` + `severity: recoverable`;
  `eligibility_not_accepted` ⟹ warning; `eligibility_accepted` ⟹ info); warning
  `presentation` tightened to `enum("notice","disclosure")`. Reference enums exported:
  `checkoutStandardErrorCodeSchema`, `eligibilityMessageCodeSchema` (also `discountRejectionCodeSchema`).
- **Order**: expectation `fulfillable_on` is `"now" | ISO date/datetime`;
  `quantity.fulfilled <= quantity.total`; line-item reference integrity (unique IDs;
  `parent_id` and every id referenced by expectations/events/adjustments resolves to an
  order line item) via `refineOrderLineItems`. Reference enum exported: `orderErrorCodeSchema`.
  (Line-item `status` derivation and event tracking-when-not-`processing` were already enforced.)
- **Catalog**: `get_product` requires `product.selected` when options present (scoped to
  `detailProductSchema`); all `type:"error"` catalog messages must be `severity:"recoverable"`
  (`refineCatalogMessages` on search/lookup/get_product responses); search request must carry a
  non-empty `query` or ≥1 filter; lookup response product IDs unique; `priceFilterSchema` min ≤ max.
  Reference enums exported: `catalogErrorCodeSchema`, `catalogWarningCodeSchema`, `catalogInfoCodeSchema`.
  (`inputs` min 1 on lookup variants, availability combos, pagination cursor-when-has_next_page,
  selected-option integrity were already enforced. `inputs[].match` intentionally left an open string.)

Pre-existing: checkout `requires_escalation` ⟹ `continue_url` + an escalation
message; checkout totals sign convention (`discount`/`items_discount` negative,
`subtotal`/`fulfillment`/`tax`/`fee` non-negative) + unknown types require
`display_text` + HTTPS `continue_url` + required `payment_handlers`; order line-item
`status` derivation; fulfillment-event tracking fields required when type ≠ `processing`;
product `selected` option integrity; price-range currency match + min ≤ max; rating scale bounds.

---

## Part C — NOT expressible in Zod (enforce elsewhere)

| Rule | Spec | Why Zod can't | Enforce where |
|------|------|---------------|---------------|
| `codes` replaces prior codes; `[]` clears | Discount | needs prior request | server session logic |
| Carry discount codes cart→checkout | Discount | cross-resource state | conversion handler |
| Idempotent cart→checkout; reuse existing checkout for `cart_id` | Cart | needs existing sessions | conversion handler |
| Cart/checkout linkage, reflect modifications, TTL clear | Cart | stateful/temporal | session store |
| Resolve provisional claims at completion | Discount | session lifecycle | completion handler |
| Update is a *full replacement* of the cart | Cart | no baseline in payload | update handler |
| `supports_multi_group` ⟹ `groups.length === 1` | Fulfillment | depends on platform profile | response builder + negotiated config |
| `allows_multi_destination` / `allows_method_combinations` | Fulfillment | depends on business config | response builder |
| `cart_id` only when cart capability advertised | Cart | depends on profile | request handler |
| `item.id` recognized by Platform & Business | Cart | catalog lookup | product resolver |
| `currency` correctly derived from context/geo-IP | Cart/Checkout | external data (format only is checkable) | pricing service |
| Discount `amount` = real math; `"across"` proportional; priority order applied | Discount | needs catalog prices + rules | pricing engine |
| Fulfillment applies only to physical goods | Fulfillment | needs per-item product type | response builder |
| `signals` MUST NOT be buyer-asserted | Cart/Checkout | provenance/trust property | platform ingestion |
| `eligibility` values MUST be non-identifying | Context | semantic privacy property | platform + review |
| Option `title` distinguishes siblings; `description` complete & non-repeating; meaningful ordering | Fulfillment | natural-language semantics | content/business rules |
| **Buyer consent enforcement** (respect analytics/marketing/sale_of_data) | Buyer Consent | "protocol communicates, does not enforce" | business systems (legal) |
| `not_found` on expired/canceled cart; 6h TTL; "totals are estimates" | Cart | runtime/temporal | session store / pricing |
| Scopes (`dev.ucp.shopping.cart:manage`) | Cart | access control | auth layer |
| Version negotiation / publish version-specific profiles | Protocol | needs fetching other profiles | discovery service |

---

_Last updated alongside the discount / buyer-consent / fulfillment / cart constraint
work. When you implement a Part A item, move its summary into Part B._
