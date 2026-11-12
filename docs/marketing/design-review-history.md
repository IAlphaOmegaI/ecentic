# Design review history and decision provenance

This ledger explains the provenance of the [canonical design system](../context/design.md).
It is historical evidence, not a second design specification or a replacement for current product rules.
The archive through round 15 contains **21 saved Markdown files, 377 numbered comments, and one standalone inspiration brief**.
The [shopping-reference transcript](review-16-shopping.md) adds **25 comments**, followed by
**12 comments** in the [integrated-surface and editorial transcript](review-17-surfaces.md).
The [recovery and conversion review](review-18-recovery-demo.md) adds **11 comments**.
The [seam and conversation review](review-19-seams-and-conversation.md) adds **2 comments**.
The full review set now contains **427 numbered comments** across 25 Markdown sources.
Within the external archive, twenty files contain numbered comments; its remaining file references five inspiration images but contains no numbered comments.
Some numbered-comment files also contain unnumbered follow-up requests; those requests inform the synthesis without increasing the numbered count.
No screenshots or image contents are reproduced here.

## Reading and precedence

- Read the canonical design system for the current implementation rules; use this ledger to understand why they changed.
- A later instruction for the same element supersedes an earlier conflicting treatment. A request for another element does not create a global ban.
- Direct chat decisions are listed separately because they are not claims found in the saved annotation files.
- Browser URLs, selected text, and selectors identify context; they do not establish product capabilities or business facts.
- “Maybe” remains a proposal. An image-only “remove this” or region-only rejection does not identify a component without further evidence.
- Exact dimensions, motion durations, tokens, icon families, and implementation mechanics are not attributed to a comment unless it specifies them.

## Source inventory

All filenames below are relative to this local archive root:

```text
/Users/xhurianshaba/Documents/Claude/Projects/écentic/Codex review annotations 2026-11-10/
```

Aliases are stable citation keys: `0517 #22` means User Comment 22 in that row's file; `I #9` means initial annotation 09.
Rows follow review order. Four-digit aliases through `2255` are 11 November; `0141`, `0445`, and `0517` are 12 November.
SHA256 covers each complete saved file's raw bytes, including any unnumbered request text.

| Alias | Saved filename | Numbered comments | SHA256 |
| --- | --- | ---: | --- |
| `I` | `annotations.md` | 65 | `a6f480926834c495a5b61523f27cf915545ad094428152376b2ea0d29ace9f01` |
| `R2` | `later-rounds/round-2-v3-pdf-27-comments/comments.md` | 27 | `0ab951fd0510420ac7bb02213f69345e0c6add8301642cb7547a8afcca6d3dd3` |
| `R3` | `later-rounds/round-3-v4-pdf-13-comments/comments.md` | 13 | `b02fb676ceef72cfb049b6406ff89f32ec2453ea9523e89fa498cecde7aa897c` |
| `R4` | `later-rounds/round-4-browser-9-comments/comments.md` | 9 | `f2d4407d8cd020b161f34033d525ef5b018afe6f3d8fc851d856b4d74b27e73b` |
| `R5` | `later-rounds/round-5-browser-4-comments/comments.md` | 4 | `45d97e9b25a2afc83794e7c762c90e09a8dece332b9f7d6e298d74eb943f32b0` |
| `0647` | `later-rounds/round-11-11-0647-4-comments/comments.md` | 4 | `92142c1f195b71cbd4cb5151144db61100cf0e1fe0647de82c104f671e9945c9` |
| `0658` | `later-rounds/round-11-11-0658-2-comments/comments.md` | 2 | `d2b426c065555c3a88e8c3272e483a090745d6705781c118144c1deba58a11b5` |
| `0707` | `later-rounds/round-11-11-0707-16-comments/comments.md` | 16 | `8f26c261823184bd5ce2df036ffab60294687b828046a629bcfd7eeec2501544` |
| `0740` | `later-rounds/round-11-11-0740-5-comments/comments.md` | 5 | `f63cfd19958a302d1960cd1c0d40d9a025976ca2de7aa6d4084fef37dbc58ce6` |
| `1435` | `later-rounds/round-11-11-1435-19-comments/comments.md` | 19 | `4ebb1c431313dca297125b14f43c797cc09388bdbf02e1a0f4db2be0f48087ef` |
| `1753` | `later-rounds/round-11-11-1753-36-comments/comments.md` | 36 | `3c4cdac90b8297d993b6b59c0f47bcee820a6acdce0a47683db3b123a17964b1` |
| `1823` | `later-rounds/round-11-11-1823-5-comments/comments.md` | 0 | `17c68286a47156e09a9b987a982c2b2fa1a3a7e71e9acfda1026dc9788d08dce` |
| `1844` | `later-rounds/round-11-11-1844-13-comments/comments.md` | 13 | `0d013b2ec91c4a943ea0101136cee7aea8e47d461149eeacc071677352850140` |
| `1911` | `later-rounds/round-11-11-1911-1-comments/comments.md` | 1 | `240c8d5e3112a518a60c05d5b65feadc170dc5975d621da413e824256798543e` |
| `1953` | `later-rounds/round-11-11-1953-21-comments/comments.md` | 21 | `2e299072922148e919d759eb36a4dfcc1dedeafdd413d079821703603cce2ecd` |
| `2032` | `later-rounds/round-11-11-2032-10-comments/comments.md` | 10 | `ed2ac0ed9f6e69ad5bc6aa5b210af65e4694be09e06b5a2bb188cf18403a01c4` |
| `2133` | `later-rounds/round-11-11-2133-10-comments/comments.md` | 10 | `0773e66eb095b07d488be7e95e8b3abeaa8db1fa54af50c735edad4701e98030` |
| `2255` | `later-rounds/round-11-11-2255-21-comments/comments.md` | 21 | `91a18a231657f5f827f99cf6395c2e715552025217122cf99c20fde80ed9d8c3` |
| `0141` | `later-rounds/round-11-12-0141-33-comments/comments.md` | 33 | `7a0e5732c71fdf613a17403dc3ef359bb19aee1041a849021655ae03c645e35e` |
| `0445` | `later-rounds/round-11-12-0445-17-comments/comments.md` | 17 | `41811d27eb7a05eedcfd7a81d82019052ad3a031d87562c42c4f58cccda4ba6f` |
| `0517` | `later-rounds/round-11-12-0517-51-comments/comments.md` | 51 | `4015fd1d32e80a0cd9aabdfe6da3ac07b33c9e84e9b94ce27eb8536a00e6a693` |

`1823` is the standalone reference brief: one request and five image references, **not five comments** despite its folder suffix.
The early/middle/late synthesis coverage reconciles as **145 + 110 + 122 = 377** numbered comments.
All numbered sets are sequential from 1 through their listed count; image-caption repetitions are not additional comments.

## Subsequent shopping-reference review

`R16` refers to [review-16-shopping.md](review-16-shopping.md), a text-only transcription of the
25-comment chat round after `0517`. It is stored in the repository rather than under the external
archive root. SHA256: `18ec177e8c5a231fe3c92340fd965205c4ef3a2f85fa84f63f9dcc08c6d02e76`. Two supplied HTML files are listed and hashed in that transcript;
they are visual evidence, not executable dependencies or product claims.

- `R16 #1–4`: the homepage roadmap becomes wholly dark; retain simulation product cards and place
  the ecentic box above them; complete the clean-source tonal ASCII conversion.
- `R16 #5–6, #12–17`: provider-style shopping interfaces with product imagery replace generic
  transcripts, nested gray shells and repeated null-field comparisons. Preserve the approved
  dark UCP excerpt. Use one dominant illustration and factual labels instead of quote styling.
- `R16 #7–9`: one meaningful Woo diagnostic trace replaces identical before/after summaries;
  restore the compact official identity and draw the separate large Woo figure with Hairline.
- `R16 #10–11`: readable estimator disclosure and shared policy-link buttons. Billing remains
  governed by `CHAT-CAP` below; no enforcement or calculation change is authorized here.
- `R16 #18–23`: remove visible figure-state captions globally, simplify the scanner hero, repair
  sector directory borders/hover/icons, and replace the weak travel workflow composition.
- `R16 #24–25`: the complete gradient Security workbench is an approved reusable reference;
  eliminate isolated transformation arrows. Its draft content still requires confirmation.

## Direct chat decisions — not archive claims

These choices were made in the review conversation and are retained separately from the file inventory.
They resolve an option or ambiguity; no invented archive comment number is assigned to them.

| Decision key | Recorded choice | Consequence and limit |
| --- | --- | --- |
| `CHAT-TONAL` | **Tonal dots** | Use the readable tonal-dot treatment for the approved ASCII surfaces. Retain semantic Hairline figures alongside it; this is not an instruction to turn every illustration into dots. |
| `CHAT-DIFF` | **Git diff** | Use the shared Git-style diff presentation for the before/after comparison direction that was being selected. Keep useful code content and consistent rails/crosses; avoid recreating separate before/after tab shells. |
| `CHAT-FIGURES` | **Both custom Shopify + bot** | Both custom figures were approved: the Shopify bag and the shopping bot. Do not treat the choice as selecting one and discarding the other. Page-specific mappings still determine where each belongs. |
| `CHAT-CAP` | **Remove the pricing cap callout only; preserve billing** | Resolve `1953 #2` as a presentation change. Do not remove or alter the billing cap, calculation, configuration, enforcement, or underlying policy. |

The recorded choices above come from the direct conversation, not from interpreting screenshots or guessing what a region-only comment meant.

## Supplemental implementation briefs

The two pasted implementation briefs were also read. They are separate from the 21 annotation
files counted above. Their package, truthful-example, static fallback and accessibility requirements
remain relevant. Later explicit decisions supersede their initial square-input rule, one-figure-per-page
limit, light-only figure placement, proposed before/after controls and staged approval sequence.
The no-new-stylesheet-file rule remains part of the implementation contract.

| Brief | Local source | SHA256 |
| --- | --- | --- |
| Interactive elements brief | `/Users/xhurianshaba/.codex/attachments/41f37276-c295-4634-9fef-54fb0e14ef41/Pasted text.txt` | `ac07c3d284c0b7e59bfec2ef41a86ee75810d531f766f8afc9c62d174c3e08e0` |
| Hairline figures brief | `/Users/xhurianshaba/.codex/attachments/9db76ce8-8cd6-4ae5-b96a-ff6f59e409cb/Pasted text.txt` | `6e88c6888f364deb5f36189bf346acfea1e94751d9da6243ccc6a8379a1c438a` |

## Integrated-surface and editorial review

`R17` refers to [review-17-surfaces.md](review-17-surfaces.md), the 12-comment follow-up after
`R16`. It is stored in the repository. SHA256: `3783a4c4130184feaec70aef61710b131b3bfad9b9eb3ced8e0339bc94974a09`.

- `R17 #1` supersedes the large flat Google hero mark: compact genuine identity accompanies
  the title, while the illustration plane uses a meaningful Hairline figure.
- `R17 #2–4` replaces unbounded setup expansions with a visibly framed sequence and calls for
  dimensional document/product artwork rather than another oversized field icon.
- `R17 #5` clarifies that hover emphasis belongs to actual interactive targets, not static
  headings in their detail panel.
- `R17 #6–8` extends the established system to the Privacy overview/contents and Stories evidence,
  while retaining the legal text and verified customer facts.
- `R17 #9–12` rejects the nested conversation frame, undersized room images and repetitive
  evidence column. The conversation fills the column, Google has a faithful AI Mode composition,
  and inspection presents compact distinct source evidence. Actual product-result tiles remain useful.

## Shared boundaries, recovery and conversion review

`R18` refers to [review-18-recovery-demo.md](review-18-recovery-demo.md), the 11-comment follow-up
after `R17`. SHA256: `78ac50ae4b6165c4e8f909efe4e52594dd9846ea9a89bb73b6c455a51febe093`.

- `R18 #1–2` reinforces one consistent sector qualification surface and complete section seams.
- `R18 #3–4` distinguishes the 404 recovery navigation as a blue cutout surface and the actual
  agent discovery links as a compact charcoal code surface.
- `R18 #5–8` brings tonal ASCII into the Partners application, keeps it in the Demo agenda,
  replaces the agenda selector with visible content, and gives the form a connected progress
  roadmap. A plane replaces the generic sieve hero.
- `R18 #9–11` removes redundant padding around embedded shopping previews, adds meaningful
  sector identity and requires the complete conversation/UCP excerpt to remain reachable by scrolling.

## Seam ownership and full-column conversation review

`R19` refers to [review-19-seams-and-conversation.md](review-19-seams-and-conversation.md),
the two-comment follow-up after `R18`. SHA256: `59c6c038c7d5be189ff3c33f48328af08bd42dd6350c4c5febaa9e5d3f1e02e4`.

- `R19 #1` removes the doubled setup-to-FAQ rule in Google Merchant Center. The band owns
  its final border and outer crosses; roadmap junctions remain at interior column boundaries.
- `R19 #2` makes the Perplexity shopping conversation fill its owning column, removing the
  redundant inset shell while retaining the product tile, message bubble and sample qualifications.

## Latest-choice supersession matrix

The final column summarizes the resolved intent for the cited topic; engineering details remain in the canonical design system.

| Topic | Earlier evidence or experiment | Later choice / refinement | Resolved intent |
| --- | --- | --- | --- |
| Structural versus internal rules | `I #9, #24, #31, #41, #47` request page-wide horizontal rules; `I #48` exempts internal lines. | `0707 #9, #16`; `0141 #32`; `0517 #22, #35` demand consistent section seams. | Section transitions reach through page gutters; internal dividers reach their own container edges. Do not extend every card/code-row border to the viewport. |
| Vertical rails and gradient continuity | `R2 #8–9` request fading rails without abrupt reappearance. | `2133 #7`; `0141 #12, #15, #30`; `0517 #17, #29` address cut-off gradients and incomplete columns. | Match the gradient and rail fade to the intended section or column; stretch participating panels instead of leaving unrelated gaps. |
| Progressive navigation chrome | `I #2, #7` request layered blur and a clear locale affordance. | `R4 #1–4`; `1823 request` add mobile blur, stable menu position, centered width, and adaptive navbar color. | Navigation should remain legible over its background and opening it must not move or scroll the page. |
| Navigation table | `1435 #1` allows a subtle tint while removing the outside border. | `1844 #9–10` again remove background and outside borders. | Keep the nav composition transparent, retaining useful internal dividers; the earlier optional tint is not a mandate. |
| Button hierarchy | `I #5–6, #22, #39, #42, #46, #57, #61` seek proper primary/flat actions. | `R2 #1`; `1753 #32` explicitly call for soft or non-primary secondary actions. | Use the shared variants with clear primary/secondary hierarchy; contextual flat/full-width suggestions do not make every control identical. |
| Titles and indexes | `I #25, #58`; `1435 #3, #12, #16`; `1753 #27, #34` ask for clearer hierarchy. | `2255 #21`; `0141 #4, #9–10`; `0445 #5, #13–14` request consistent titles, emphasis, and helper-note placement. | Reuse a readable title/subtitle/index system across page families; do not infer all-caps micro-labels from requests for eyebrows. |
| Monospace | `R3 #4` rejects mono for ordinary text. | `1435 #4`; `1753 #7, #18, #26, #36`; `1844 #4`; `2032 #5` request code styling for technical content. | Body text remains ordinary typography; scopes, fields, versions, snippets, and code differences get appropriate code treatment. |
| Color and gray/blue panels | `I #13, #38, #54` suggest muted cards; `R2 #4` rejects gray outside. `I #64` dislikes one black treatment, while `R2 #25` likes black elsewhere. | `0707 #5, #12`; `1753 #3, #14` reject isolated blue slabs and undifferentiated gray. | Use purposeful surface hierarchy. These are placement judgments, not blanket bans on gray, blue, gradients, or black. |
| Dark technical sections | `1844 #13`; `2032 #4`; `2255 #15–19` expand dark work areas. | `0141 #6, #16, #21, #28, #33`; `0517 #28, #40–41` require coherent whole sections. | Theme the entire participating work area; avoid a half-black/half-white demonstration or nested isolated black boxes. |
| Cutouts and reference inspiration | `1823 request` asks to adapt the philosophy of reference cards, falling light, logo arcs, and original nav cutouts. | `1911 #1/request` extends cutouts to full workflows, pricing, footer, and light backgrounds. | Cutouts are a site-wide framing device on suitable light or dark surfaces. Adapt the reference language rather than copying the reference screens. |
| Whole-footer gradient | `1953 #8` proposes a more distinct footer. | `2032 #10` clarifies that the gradient covers the whole footer. | Treat the gradient as one footer field; a small isolated gradient component does not satisfy the scope. |
| Legible ASCII | `R2 #2, #7, #23`; `0740 #5` reject weak/crude ASCII while requesting relevant objects. | `1844 #2`; `1953 #15, #19`; `CHAT-TONAL`; `0517 #1–3, #11, #39`. | Prefer recognizable tonal-dot objects and purposeful backgrounds. Merely having ASCII texture is insufficient. |
| ASCII and Hairline coexistence | `2133 #5, #8`; `2255 #1–2` request more Hairline. | `0445 #17`; `0517 #1–3, #36, #39`; `CHAT-FIGURES` preserve both media and both approved custom figures. | Use semantic Hairline foreground objects with relevant tonal ASCII where requested; do not replace one medium globally with the other. |
| Footer wordmark | `R2 #27` asks for large legible ASCII; `2133 #2` tries a wide Hairline-drawn wordmark. | `0517 #6` explicitly asks for dimensional ASCII drawn/revealed; `CHAT-TONAL` resolves the renderer. | The latest wordmark direction is dimensional tonal dots with a reveal, while Hairline remains available elsewhere. |
| Semantic figure choice | `1435 #10`; `1753 #12, #24`; `2133 #1, #3, #9` reject repeated or unreadable subjects. | `0445 #8, #12, #15`; `0517 #4, #7–10, #16, #20, #24, #36, #46, #49`. | Match objects to the meaning: repair tools, money, connected documents/network, sector products, book, contact/support subject. Reuse the language, not an unrelated generic basket everywhere. |
| Figure captions and brands | `0707 #1–2, #4` makes genuine provider identity prominent; `0740 #3` removes Shopify's Live badge. | `0517 #12, #14, #23, #45` removes the Shopify figure name and requests Woo/Google/security logos. | Preserve genuine brand identity and accessibility names; remove the specifically rejected visible caption/status clutter. Avoid duplicate oversized logos. |
| Connected journeys | `R2 #7`; `R4 #8`; `R5 #2`; `1753 #8, #16, #25`; `1844 #6` reject card piles and bare text tabs. | `2133 #10`; `0517 #15, #19, #26, #30, #32–34` name the approved steppers for reuse. | Connected, icon-led stages are the positive reference for explanatory workflows. Tabs may still serve appropriate controls, but are not the finished story by themselves. |
| Step numbering | `0647 #1` tries a separate ASCII numeral; `I #55` had questioned decorative numbers in another region. | `0740 #1`; `1435 #19` put normal numerals with titles. | Preserve useful step numbers in the title hierarchy; remove decorative floating ASCII number badges. |
| Autoplay and model controls | `1753 #29–30` approves a replay and asks it to advance; `2133 #10` dislikes repeated clicking. | `0517 #27–28` asks for square/icon model controls and coordinated automatic figure changes. | Let the illustrative narrative explain itself with synchronized stages; optional inspection remains. This is not permission to autoplay transactional controls. |
| Real chat examples | `2255 #4, #9`; `0141 #11, #25` reject quotes/tables as substitutes for an interaction. | `0445 #10–11, #16`; `0517 #29` ask for an actual writing/chat interface and visible inspection stages. | Show shopper messages, assistant responses, evidence/products, and staged writing. Preserve simulation labels and provider capability limits. |
| Before/after comparisons | `1753 #4, #18, #26`; `2255 #3, #8` prefer useful code to weak wrappers. | `CHAT-DIFF`; `0141 #14, #23–24, #27`; `0445 #1–4`; `0517 #41, #44`. | Reuse the approved Git diff surface, seams, and crosses. Remove nested bordered/padded shells rather than discarding the code itself. |
| Table scrolling | `R3 #10` asks to verify a wider scrolling table on desktop/mobile. | `0658 #2` disables scrolling on the homepage channel table; `2133 #4` flags a separate pricing scroll defect. | Keep the homepage channel comparison readable without awkward scrolling; retain correct scrolling where a true wide data table requires it. |
| Artwork scale and clipping | `R3 #5`; `0740 #4` enlarge decorative art to fill a background. | `1753 #2`; `1953 #18` reduce excess height; `0517 #5` fixes the cut-off simulation graphic. | Background cropping is deliberate and contextual; featured objects and functional content must remain complete. Larger is not always better. |
| Forms and CTA composition | `1753 #11` rejects a particular inline store-address arrangement. | `1844 #1`; `2032 #9` request rounded inputs and a store-address action alongside Book a demo. | Improve composition and remove duplicate actions; do not infer a global prohibition on store-address inputs. |
| Public pricing layout | `I #54` tentatively offers 2×2. | `1953 #6` groups subscriptions in one row and PAYG/Enterprise in the next. | Public Compete/Scale/Dominate form row one; PAYG/Enterprise form row two. Align offers, prices, and actions; dashboard paywall scope is separate. |
| Pricing cap copy | `1953 #2` ambiguously says to remove the cap. | `CHAT-CAP` explicitly limits the change to the callout. | Remove that presentation only; preserve the billing policy and all enforcement/calculation behavior. |
| Security flow treatment | `0141 #6` asks for a black draft work area. | `0517 #45` asks for a whole-flow gradient with real provider logos. | Use the later region-specific gradient direction. Visual review does not authorize draft operational claims or removal of the review gate. |
| Blog and supporting pages | Earlier generic graphics/text layouts. | `0517 #36–37, #43, #46–51` names a book, square rounded thumbnails, icon-led docs navigation, meaningful contact/support graphics, and Nucleo for the indicated icon. | Apply the named page-specific objects and geometry. A contained desktop sticky support figure is an implementation of “fixed”; mobile content must remain unobstructed. |

## Reusable positive references

These are explicitly approved directions, not evidence that every page should contain every pattern.

- `1753 #23, #33`; `1953 #9`: large, readable Hairline inspection figures and product cards that lift toward the pointer.
- `1753 #35`: the integrations import graphic is a successful mechanism to reuse with relevant content.
- `1844 #7–8`: preserve the approved surrounding homepage section while repairing rotated content and inconsistent card labels.
- `1953 #15`: improved readable point artwork is approved for animation and wider use.
- `1953 #17`: the following-logo composition is approved; later alignment feedback in `2032 #6–7` still applies.
- `1953 #20`: the selected Brands sample step is a positive reference; approval does not establish new product claims.
- `2133 #5–6`: keep the useful score/estimator story while improving the visual treatment, rather than deleting the metric or calculator.
- `0517 #15, #19, #26, #30, #32–34`: approved Connect/Shopify steppers establish the later reusable setup/process reference.

## Foundations retained across the rounds

- **Typography and alignment:** `I #19, #25, #32–34, #58`; `R3 #4`; `0740 #2`; `2255 #21`; `0445 #5, #13–14` support consistent titles, secondary text, technical-only mono, aligned labels, and useful distinct copy.
- **Normal outer background:** `I #1, #49, #54, #60`; `R2 #4, #24` retain restrained margins and normal-background surroundings while allowing expressive bounded features.
- **Logos and icons:** `I #20, #30, #43–45`; `0647 #3`; `1435 #6`; `1753 #1, #6, #10, #19–22`; `1953 #21` favor actual provider identity and legible category/link icons.
- **Dense content:** `I #59, #62`; `R2 #10`; `R4 #7`; `1844 #11` support accordions and grouping where they reduce overload, not mandatory collapse of primary explanations.
- **Charts:** `R3 #2`; `R4 #6`; `R5 #1, #3`; `2133 #5` favor proper, readable charts with meaningful percentage color, consistent treatment, and purposeful interaction.
- **Site-wide application:** `I #65`; `R3 #8–9`; `R5 #4`; `1844/1911/1953/2032/2133 requests` repeatedly require propagating accepted patterns beyond the landing page and updating design documentation.

## Evidence boundaries

- The reference brief `1823` is about layout philosophy, selected gradients, light, cutouts, logo arcs, and adaptive chrome. It explicitly rejects copying the reference screens directly.
- Initial image-only comments and later region-only “no”/“hate it” comments remain local rejections when their targets or replacements are not identifiable from text.
- `1844 #5` contains ambiguous text-density feedback; it does not establish a universal word-count target.
- `1753 #31` questions a chart's usefulness; a question alone is not a definitive global chart-removal instruction.
- `2255 #5–6, #10–11` requests clearer sector explanation and reviewable test copy, not invented provider support, regulated payment capability, or guarantees.
- `0141 #17, #19`; `0517 #25` concern clarity/presentation and do not silently change channel facts, OAuth scope, or consent requirements.
- `CHAT-CAP` is the explicit billing boundary. Product and pricing behavior remains governed by the product documentation and code, not an inferred visual preference.
- Accessibility behavior, reduced motion, keyboard controls, shared component APIs, and semantic tokens come from current engineering/canonical rules; the historical comments do not specify their exact implementation.

## Audit and maintenance notes

- Counts use numbered annotation headings only; each source was checked for a complete sequential range. Folder suffixes are descriptive, not the counting authority.
- SHA256 identifies the exact saved text reviewed. If an archive file is amended, recalculate its hash and document the amendment rather than silently treating it as the same source.
- The detailed temporary syntheses are `output/review-round15/history-early.md`, `history-middle.md`, and `history-late.md`; this ledger is their compact durable provenance layer.
- Add future decisions as new dated evidence. Update the [canonical design system](../context/design.md) to express the accepted current behavior, and retain this ledger's supersession trail.
