# écentic — IP & Trademarks Memo

**Last updated:** 2026-06-02

## Position

All intellectual property created in the course of écentic's business is owned exclusively by écentic shpk, the Albanian limited liability company that is the contracting entity for all founder service relationships, contractor service agreements, employment contracts, and customer agreements. No founder or contributor holds residual claims to material IP created in the course of their work.

The Company has no acquired or licensed-in third-party IP that is material to its business, other than standard open-source dependencies (each subject to its respective permissive license: MIT, Apache 2.0, BSD) and commercial SaaS / API providers (Vercel, Azure AI Studio, OpenAI, Anthropic, Google AI, Better Auth, UploadThing, Sentry, PostHog).

---

## IP categories

### 1. Copyright in source code, content, and product designs

| Asset | Owner | Mechanism |
|---|---|---|
| Source code (Next.js app, server logic, simulation engine, agent traffic beacon, UCP generator) | écentic shpk | Section 8.3 of Shareholders Agreement (Founder IP Assignment); Section 6 of contractor service agreements (Mario, Arbi) |
| Marketing copy, deck content, one-pager, blog content | écentic shpk | Section 8.3 Shareholders Agreement; work-for-hire clauses in contractor agreements |
| Visual identity (logo, color system, typography choices) | écentic shpk | Designed under contractor agreement (Mario Vukzaj) with explicit assignment |
| Database schema, data model design | écentic shpk | Founder IP assignment |

### 2. Trade secrets

The simulation orchestration logic — how écentic prompts, sequences, and evaluates the four major AI models against a competitor matchup, and the proprietary corpus that links listing content to agent behaviour to outcome — is treated as a trade secret. It is:

- Not disclosed in patent filings (would forfeit the trade-secret protection)
- Not open-sourced
- Protected by:
  - NDAs with every contractor and prospective enterprise customer
  - Access controls (the simulation engine source lives behind authenticated CI/CD, not in any public repository)
  - Confidentiality clauses in the Shareholders Agreement (Section 8.4) and all contractor agreements

### 3. Trademarks

| Mark | Status | Plan |
|---|---|---|
| "écentic" (word mark) | Unregistered as of date | Filing planned in Albania (Drejtoria e Përgjithshme e Pronësisë Industriale, DPPI) for Classes 9 (software) and 42 (SaaS) within 90 days of next round close. EUIPO filing in Classes 9 and 42 to follow within 6 months. USPTO filing in Classes 9 and 42 to follow within 12 months. |
| Logo (stylized "é" mark in écentic's blue + box) | Unregistered as of date | Filed alongside the word mark in the same jurisdictions. |
| "écentic.ai" (domain + brand identifier) | Domain registered, in use as primary brand identifier | Domain ownership documented in registrar account; transfer requires CEO authentication. |

The unregistered status is intentional at this stage — formal trademark registration is being deferred until the next funding round to align legal spend with available capital. The brand is in active commercial use, which establishes common-law trademark rights in Albania and in any jurisdiction where écentic has commercial presence.

### 4. Domain names

| Domain | Registrant | Renewal status |
|---|---|---|
| ecentic.ai | écentic shpk (or founder name, to be transferred if currently personally held) | Auto-renew enabled. Expires [TO CONFIRM date with founder] |
| ecentic.com | NOT OWNED — consider acquiring | Recommended action: explore acquisition cost |

---

## IP assignment mechanism

### Founders
Each Founder (Xhurian Shaba, Alvi Palloshi, Iseld Muça) assigns all IP created in the course of their service to the Company under Section 8.3 of the Shareholders Agreement. This includes copyright, moral rights waivers (to the extent permitted by Albanian law), and patent rights (none material to date).

### Contractors (Mario Vukzaj, Arbi Kullakshi)
Each contractor is engaged under a written services agreement with the Company. Each contractor agreement includes:
- IP assignment clause (all work product owned by écentic shpk)
- Confidentiality clause
- Non-compete clause limited to the agent-commerce / e-commerce optimization space, time-limited to the duration of the engagement plus six months
- Specific carve-out: any pre-existing IP brought to the engagement is documented and not assigned

### Employees (future)
The standard employment agreement template (to be added to the data room post-raise) includes:
- IP assignment over all work product created in the course of employment
- Mandatory confidentiality
- Mandatory return of company property on termination
- Non-solicit (12 months post-departure)

### Customers
Customers retain ownership of their catalog data, product information, brand assets, and all content they supply. écentic obtains a limited license to process this data for the purpose of operating the service. Customer-uploaded content is not used to train any AI model — this is a contractual representation in every customer agreement.

---

## Patent strategy

The Company holds no patents and has filed no patent applications as of this date.

Decision: defensive-publication / trade-secret hybrid for the simulation orchestration. Patenting the simulation methodology would require disclosure of the prompt-engineering and evaluation logic that constitutes the core defensible technology. The trade-secret route preserves the competitive advantage as long as we maintain operational secrecy (access controls, NDAs, no public source release).

Re-evaluate post-Series A: at that scale, defensive patent positions (filed primarily for cross-licensing and freedom-to-operate) may become valuable as a deterrent against larger incumbents entering the space.

---

## Litigation, claims, threats

Nil. No active or threatened IP litigation, no cease-and-desist correspondence received, no opposition to any trademark or domain claim.

---

## Open-source compliance

The Company uses third-party open-source software under permissive licenses (MIT, Apache 2.0, BSD-3). No GPL or AGPL components are used in the production stack. A software bill of materials (SBOM) is auto-generated on each build and available on request.

Specific OSS attribution requirements are observed in `LICENSE-THIRD-PARTY.md` in the public-facing docs (TBD post-Shopify App Store listing review).

---

## Risks to flag

1. **Domain `ecentic.com` is not owned by the Company.** Recommend either acquiring it (typical cost: $3K–$25K depending on the current holder) or formally accepting the risk that a third party could use it for competitive or look-alike purposes.
2. **Trademark filings are not yet on record.** Until DPPI / EUIPO / USPTO filings are made, the Company's protection is limited to common-law rights established by commercial use. Recommend completing the Albania filing within 90 days post-raise.
3. **Patent freedom-to-operate analysis has not been commissioned.** The agent-commerce optimization space is new enough that no obvious blocking patents exist, but a formal FTO review (typical cost: $8K–$15K) is prudent before signing a first enterprise contract with a strong IP indemnity.
