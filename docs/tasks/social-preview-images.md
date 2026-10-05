# Social preview images

Updated 5 October 2026.

## Routing

Next.js emits localized, hashed URLs for colocated `opengraph-image.tsx` files,
including `/en/opengraph-image-…` for the English homepage. These are image
endpoints, not localized page URLs. The proxy preserves the explicit locale on
public social image requests so next-intl cannot redirect them to a different
route. Protected and staff paths remain subject to their existing access rules.

Unprefixed nested image URLs still use the locale rewrite for compatibility.
The root `/opengraph-image` generator remains available without a locale.

Before this fix, the English homepage image redirected to
`/opengraph-image-1syllj` and returned 404. The Spanish image rendered correctly.

## Metadata defaults

Next.js replaces nested `openGraph` and `twitter` metadata when a page defines
those objects; it does not preserve their inherited images. `createMetadata`
therefore supplies the existing root brand image by default, with its absolute
URL, dimensions and alternative text for both Open Graph and Twitter.

A page with its own colocated image file must pass `image: false` to
`createMetadata`. This omits the `images` property entirely, allowing Next.js to
attach that file's URL and metadata. Setting `images: undefined` is insufficient
because Next.js checks whether the property exists. Article pages retain their
own metadata and generated image routes.

The default covers pages such as Pricing, Resources, Enterprise and the public
tools, which previously published no social image. No artwork is duplicated and
no hashed image URL is hardcoded into application metadata.

## Verification

Run `bun test src/i18n/spec/social-images.test.ts` from `apps/web` for the helper
contract. For an integration check, build and start the web application, then
read the `og:image` and `twitter:image` URLs from the actual HTML for both locales
and fetch them from that server. Check homepage, pages using the default image,
pages with specialized images, and a published article. Each URL must return a
1200×630 PNG; explicitly localized image URLs should have no locale redirect.

Also fetch the homepage as a social crawler (for example, `Twitterbot/1.0`) to
ensure metadata is included in the returned HTML, without client JavaScript.

The production-build check for this fix passed 56 page/locale combinations and
all 19 distinct image URLs, including an article in both languages. Twitterbot
and Facebook crawler requests received the metadata, the legacy nested image
URL still resolved, and protected/staff image-like paths still redirected through
the access flow. The four metadata regression tests and scoped Biome check pass.
The build passes; TypeScript retains the same 298 existing diagnostic locations
and codes, with none added by this change.
