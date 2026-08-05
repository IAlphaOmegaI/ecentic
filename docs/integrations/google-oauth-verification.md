# Google OAuth Verification — Submission Pack

> Companion to `google-merchant-center.md`. Everything Google's verification
> team needs for GCP project **ecentic** (project number **227288294062**), and
> the checks to run before resubmitting.
>
> Sections marked **[FILL IN]** need a human — test credentials, the video URL,
> and the console state can't be derived from the repo.

## 1. Scope position

We request **one** sensitive scope:

```
https://www.googleapis.com/auth/content
```

Requested at [`google-merchant.ts:18`](../../apps/web/src/server/utils/google-merchant.ts), sent
from `authorizationUrl()` with `access_type=offline` and `prompt=consent`.

- **Sensitive, not restricted** → no CASA assessment applies. Ignore that row
  on the checklist.
- If the Google sign-in provider (`auth.ts`, `socialProviders.google`) is
  enabled on the same OAuth client, the consent screen also carries
  `openid`, `email`, and `profile` — non-sensitive, no verification burden,
  but they must be listed in the console.

### Least-privilege justification (copy-paste into the console field)

> ecentic is a Google Merchant Center optimization tool for e-commerce
> merchants. Merchants connect their own Merchant Center account so ecentic can
> publish approved product-listing improvements and surface Google's
> diagnostics inside our dashboard.
>
> `https://www.googleapis.com/auth/content` is the only OAuth scope the Google
> Merchant API exposes. There is no read-only, per-resource, or otherwise
> narrower alternative for any of the operations our product requires, so
> least privilege here means requesting this single scope and nothing else —
> which is what we do. We request no other Google scope beyond the standard
> sign-in scopes.
>
> The scope backs one production feature set, all of it merchant-initiated:
> (1) identifying which Merchant Center account belongs to the merchant's
> store, by matching the account's registered homepage against their storefront
> domain; (2) establishing an accountManagement link to our advanced account,
> after explicit in-product confirmation; (3) creating a supplemental data
> source and publishing merchant-approved attribute overrides into it — we
> never write to their primary feed, which stays owned by their native Google
> plugin; (4) reading processed offers to confirm those overrides merged; and
> (5) reading account issues, item-level issues, return policies, and
> business info to display listing health and agentic-checkout readiness.

## 2. Console configuration — verify before submitting

| Item | Required state |
|---|---|
| Scopes listed | `.../auth/content` only, plus `openid`/`email`/`profile` if Google sign-in is live on this client. **Nothing else.** |
| Site Verification scope | **Must be absent.** Path 2 in `google-merchant-center.md` designs for it, but it is not built — an unimplemented scope fails the "Production-Ready" row on sight. |
| Redirect URI | `{APP_HOST}/api/integrations/google/callback` |
| Privacy policy URL | `https://ecentic.ai/privacy-policy` (§04 is the Google-specific section) |
| Terms URL | `https://ecentic.ai/terms` |
| Publishing status | **In Production** — do not flip to Testing for the review |
| App name / logo / support email | Must match the branding shown in the demo video |

Cross-check: the scopes in the console must **exactly** match what the consent
screen shows in the video. The only scope our code sends is `CONTENT_SCOPE`.

## 3. Reviewer access — **[FILL IN]**

Three gates stand between a reviewer and the integration. All three must be
pre-cleared or the submission bounces on "Zero Authentication Blockers".

1. **Email verification is mandatory** (`auth.ts`, `requireEmailVerification:
   true`). A reviewer cannot self-serve a usable account. → Supply a
   **pre-created, already-verified** ecentic login.
2. **Path 1 is Shopify-only** (`SUPPORTED_PLATFORMS` in
   `integration/google-merchant.ts`). The test account must already have a
   **Shopify** store connected and its products synced. A WooCommerce or feed
   store shows "coming soon" and the reviewer sees nothing.
3. **A Merchant Center account must exist** with the native Google channel
   already feeding it. Reviewers will not install a Shopify Google channel
   themselves.

Supply both of these:

```
ecentic test account
  URL:      https://ecentic.ai/sign-in
  Email:    [FILL IN]
  Password: [FILL IN]
  State:    email verified; Shopify demo store connected and synced

Google test account (for the OAuth consent step)
  Email:    [FILL IN]
  Password: [FILL IN]
  State:    owns a Merchant Center account with the Shopify Google & YouTube
            channel connected and offers flowing
```

**Domain-match detail that will otherwise trip the reviewer:** auto-adoption
requires the Merchant Center account's registered homepage to match the ecentic
store's domain (`detectCandidates` → `matchesStore`). Set the test Merchant
Center account's homepage to the demo Shopify store's domain, or the reviewer
lands on the manual-picker branch and has to confirm a mismatch warning.

There is no paywall, phone verification, or card requirement on this path —
state that explicitly in the submission form.

## 4. Navigation instructions (copy-paste into the form)

The integration is not linked from the marketing homepage, so Google's
"Clear Integration Access" row requires these steps verbatim:

```
1. Go to https://ecentic.ai/sign-in and sign in with the test account above.
2. You land on the dashboard. In the left sidebar, select the demo store,
   then click "Google Shopping".
3. Step 1 on that page is "Connect Google". Click it — this launches the
   OAuth consent screen requesting .../auth/content.
4. Sign in with the Google test account above and grant access.
5. You return to the Google Shopping page. Step 2 detects the Merchant Center
   account; Step 3 requests the account-management link; Step 4 provisions the
   optimization feed. Each step is a single button.
6. Below the setup steps, the "Optimizations", "Diagnostics", and
   "Agentic checkout" panels are the live product surfaces backed by the scope.
```

## 5. Demo video shot list

Public or unlisted YouTube. Every write operation needs its effect shown **in
Merchant Center**, not just in our dashboard — that is the "Source Account
Impact" row, and it is where write-heavy integrations usually fail.

Record with a Google account that is **not** an admin of our MCA. When the same
login administers both sides, the link handshake auto-establishes (spike 3) and
the reviewer sees a flow real merchants never get.

| # | Shot | Proof required |
|---|---|---|
| 1 | OAuth consent screen | Scopes **fully expanded** — click "Show all services" so `.../auth/content` is readable |
| 2 | Account detection (Step 2) | The Merchant Center account appearing in our picker with its matched domain |
| 3 | Link proposal (Step 3) | Then in Merchant Center: **Settings → People and access**, our MCA listed with account-management access. *Not* under "Linked accounts" — it does not appear there |
| 4 | Provisioning (Step 4) | Merchant Center → **Data sources**: "ecentic Optimizations" now exists |
| 5 | Default-rule patch | Merchant Center → primary data source settings: our supplemental source listed and read first |
| 6 | Push an override | Merchant Center → the offer's processed title showing the new value. Record **after the insert**, which reprocesses within seconds; a rule change alone is lazy and can take hours |
| 7 | Return policy create | Merchant Center → Settings → Return policies: the new policy |
| 8 | Customer-service contact | Merchant Center → Business info: the saved contact |
| 9 | Diagnostics read | Item issues / disapprovals rendered in our dashboard |
| 10 | **Disconnect** | Our teardown, then Merchant Center showing: data source gone, default rule restored, account-management link removed. Delete paths must be shown reflected in the source account |

Video URL: **[FILL IN]**

## 6. Privacy policy → checklist row mapping

All five disclosure rows are answered by **§04 "Google User Data (Merchant
Center)"** at `https://ecentic.ai/privacy-policy`
([`page.tsx`](<../../apps/web/src/app/(main)/privacy-policy/page.tsx>)):

| Checklist row | Where |
|---|---|
| Data Access | §04 "What we read" / "What we write" — enumerated per API resource |
| Data Use | §04 "How we use it" |
| Data Transfer | §04 "How we share it" — processors only, no brokers/advertisers |
| Data Protection | §04 "How we protect it" — TLS, encryption at rest, token handling |
| Data Retention & Deletion | §04 "How long we keep it" — disconnect teardown, account deletion, Google-side revocation link |
| Limited Use statement | §04 "AI and machine learning" |

The AI/ML rows on the checklist bind **Workspace and Photos APIs** only, which
does not include the Merchant API. We state our position anyway: data read from
Merchant Center never reaches an AI model. Verified in code — nothing under
`server/app/intelligence/` or `optimization.ts` imports the Google Merchant
modules; optimization text is generated from the platform-synced catalog and
pushed to Google, never the reverse.

## 7. Pre-submission checklist

- [ ] Console scopes match the code exactly; no Site Verification scope
- [ ] Privacy policy §04 is **live in production** (reviewers fetch the public URL)
- [ ] Test ecentic account created, verified, Shopify store connected and synced
- [ ] Test Google account owns a Merchant Center account with matching homepage domain
- [ ] Demo video uploaded, public/unlisted, consent screen scopes expanded
- [ ] Every write in §5 shown reflected in Merchant Center, including deletions
- [ ] Navigation steps pasted into the form
- [ ] "No paywall / no phone / no card on this path" stated in the form
- [ ] Unverified-quota exposure controlled — see below

## 8. Unverified-quota exposure

Until approval, every real merchant who clicks "Connect Google" sees the
"unverified app" interstitial and burns one of the 100 unverified-user slots.
Gate the button to test accounts (or hide the Google Shopping entry point for
everyone else) until verification lands, and keep publishing status **In
Production** throughout — Google's guidance is explicitly to trigger unverified
scopes in a staging path inside the production app, not to unpublish.
