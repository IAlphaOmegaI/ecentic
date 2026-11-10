# Enterprise content audit

Generated 2026-11-10T22:50:09+00:00. Scope: every string leaf in 26 `apps/web/messages/fragments/enterprise*.json` files. Both EN and ES are included. This is a complete substring scan of the brief’s requested English catalog terms, plus its strict raw-HTML phrase list and every `{TODO: ...}` value in these new fragments.

The scan is deliberately literal: it reports occurrences inside longer words and records a justification instead of silently suppressing them. A justification is evidence/context, not a waiver of a strict prohibition. Source code, generated catalogs, unchanged legal fragments and published blog bodies are outside this new-fragment scan. The pre-existing enterprise.en/es.json pair is excluded; its old /enterprise URL is now a 301 to /solutions/enterprise.

## Summary

- Requested vocabulary hits: 22 string leaves.
- Strict phrase hits: 0 string leaves.
- TODO-bearing strings: 146 across both locales.
- Unconverted instruction-style square-bracket strings: 0.

## Strict phrase hits

The brief says these phrases must not occur in rendered new pages. Even a negated feature disclosure can fail that literal check. Values below need removal/rephrasing unless they are private draft content.

No hits.
## All requested vocabulary hits

### EN · /ai-channels/claude · rank

- Source: `apps/web/messages/fragments/enterpriseChannels.en.json` → `enterpriseChannels.pages.claude.sections.1.description`
- Reason: Measurement limitation: explicitly bounds a simulation rather than promising a live result. Retained for factual clarity; strict vocabulary review remains available.

> The retailer provides catalog, inventory, policy and cart tools to its own agent. ecentic’s simulations use the product and competitor information assembled for the comparison; they are not a live ranking report from Claude.

### EN · / · SEO

- Source: `apps/web/messages/fragments/enterpriseHome.en.json` → `enterpriseHome.faq.items.6.question`
- Reason: Category-boundary explanation/FAQ: distinguishes ecentic from SEO/GEO rather than promising search rankings.

> Is this SEO?

### EN · / · rank

- Source: `apps/web/messages/fragments/enterpriseHome.en.json` → `enterpriseHome.faq.items.6.answer`
- Reason: Names or explains an implemented measurement/tool; must retain its stated scope and limitations.

> ecentic focuses on the product data and checkout that AI shopping assistants use to compare and buy. The work can overlap with structured-data and catalog quality practices, but its measurements are simulations, detected AI referrals and checkout checks, rather than search rankings.

### ES · / · SEO

- Source: `apps/web/messages/fragments/enterpriseHome.es.json` → `enterpriseHome.faq.items.6.question`
- Reason: Category-boundary explanation/FAQ: distinguishes ecentic from SEO/GEO rather than promising search rankings.

> ¿Esto es SEO?

### EN · Shared navigation/footer · visibility

- Source: `apps/web/messages/fragments/enterpriseNav.en.json` → `enterpriseNav.groups.0.columns.1.items.6.href`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> /platform/simulate#brand-visibility

### EN · Shared navigation/footer · visibility

- Source: `apps/web/messages/fragments/enterpriseNav.en.json` → `enterpriseNav.groups.0.columns.1.items.6.label`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Brand Visibility

### ES · Shared navigation/footer · visibility

- Source: `apps/web/messages/fragments/enterpriseNav.es.json` → `enterpriseNav.groups.0.columns.1.items.6.href`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> /platform/simulate#brand-visibility

### ES · Shared navigation/footer · visibility

- Source: `apps/web/messages/fragments/enterpriseNav.es.json` → `enterpriseNav.groups.0.columns.1.items.6.label`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Brand Visibility

### EN · /platform · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.en.json` → `enterprisePlatform.overview.sections.1.items.6.title`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Brand Visibility

### EN · /platform · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.en.json` → `enterprisePlatform.overview.sections.1.items.6.href`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> /platform/simulate#brand-visibility

### EN · /platform/simulate · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.en.json` → `enterprisePlatform.pages.simulate.sections.11.id`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> brand-visibility

### EN · /platform/simulate · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.en.json` → `enterprisePlatform.pages.simulate.sections.11.title`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Brand Visibility

### EN · /platform/simulate · rank

- Source: `apps/web/messages/fragments/enterprisePlatform.en.json` → `enterprisePlatform.pages.simulate.faqs.0.question`
- Reason: Names or explains an implemented measurement/tool; must retain its stated scope and limitations.

> Is this live ranking data?

### ES · /platform · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.es.json` → `enterprisePlatform.overview.sections.1.items.6.title`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Brand Visibility

### ES · /platform · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.es.json` → `enterprisePlatform.overview.sections.1.items.6.href`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> /platform/simulate#brand-visibility

### ES · /platform/simulate · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.es.json` → `enterprisePlatform.pages.simulate.sections.11.id`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> brand-visibility

### ES · /platform/simulate · visibility

- Source: `apps/web/messages/fragments/enterprisePlatform.es.json` → `enterprisePlatform.pages.simulate.sections.11.title`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Brand Visibility

### EN · /ai-instructions · SEO, GEO

- Source: `apps/web/messages/fragments/enterpriseRecovery.en.json` → `enterpriseRecovery.instructions.description`
- Reason: Contextual product, historical or technical wording; review the full string below. This report does not silently waive the preferred sales vocabulary.

> ecentic helps teams prepare product data for AI shopping. Use these boundaries and public entry points to choose the right next step. ecentic isn’t an SEO or GEO tool.

### EN · /ai-instructions · rank

- Source: `apps/web/messages/fragments/enterpriseRecovery.en.json` → `enterpriseRecovery.instructions.sections.1.paragraphs.0`
- Reason: Measurement limitation: explicitly bounds a simulation rather than promising a live result. Retained for factual clarity; strict vocabulary review remains available.

> Simulations describe a test, not a live marketplace ranking or a guaranteed sale. The free store check uses three assistants; the separate free product comparison tool can use four.

### ES · /ai-instructions · SEO, GEO

- Source: `apps/web/messages/fragments/enterpriseRecovery.es.json` → `enterpriseRecovery.instructions.description`
- Reason: Category-boundary explanation/FAQ: distinguishes ecentic from SEO/GEO rather than promising search rankings.

> ecentic ayuda a preparar datos de productos para las compras con IA. Usa estos límites y puntos de entrada para elegir el siguiente paso. ecentic no es una herramienta de SEO ni de GEO.

### EN · /solutions · visibility

- Source: `apps/web/messages/fragments/enterpriseSolutions.en.json` → `enterpriseSolutions.index.sections.2.description`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> You own the brand and budget. Inspect recorded product comparisons and the ChatGPT Brand Visibility feature, then work on the verified product facts you control.

### ES · /solutions · visibility

- Source: `apps/web/messages/fragments/enterpriseSolutions.es.json` → `enterpriseSolutions.index.sections.2.description`
- Reason: Exact product feature name or its translation; permitted feature-name exception.

> Eres responsable de marca y presupuesto. Revisa comparaciones y la función Brand Visibility de ChatGPT, y trabaja en los datos verificados que controlas.

## Open values by route

Each entry is the full string so its context and every placeholder remain reviewable. Private research placeholders do not describe a public page.

### /

- **EN** `enterpriseHome.programs.missingAsset` (`apps/web/messages/fragments/enterpriseHome.en.json`): {{TODO: official logo}}
- **ES** `enterpriseHome.programs.missingAsset` (`apps/web/messages/fragments/enterpriseHome.es.json`): {{TODO: logotipo oficial}}

### /about

- **EN** `enterpriseCompany.about.sections.2.note` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: supply approved founder portraits}}
- **EN** `enterpriseCompany.about.sections.6.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: exact legal name and registered address of the Polish operating company}}
- **EN** `enterpriseCompany.about.sections.6.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: exact legal name and registered address of the Delaware company}}
- **EN** `enterpriseCompany.about.sections.6.rows.3.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm the public +355 contact number}}
- **EN** `enterpriseCompany.about.programs.4.description` (`apps/web/messages/fragments/enterpriseCompany.en.json`): Accelerator. {{TODO: supply the official Fil Rouge Capital logo}}
- **ES** `enterpriseCompany.about.sections.2.note` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: proporcionar retratos aprobados de los fundadores}}
- **ES** `enterpriseCompany.about.sections.6.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: nombre legal exacto y domicilio registrado de la empresa operadora polaca}}
- **ES** `enterpriseCompany.about.sections.6.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: nombre legal exacto y domicilio registrado de la empresa de Delaware}}
- **ES** `enterpriseCompany.about.sections.6.rows.3.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar el teléfono público de contacto +355}}
- **ES** `enterpriseCompany.about.programs.4.description` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Aceleradora. {{TODO: proporcionar el logotipo oficial de Fil Rouge Capital}}

### /contact

- **EN** `enterpriseCompany.contact.sections.0.items.3.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm press@ecentic.ai is active before publishing the press contact}}
- **EN** `enterpriseCompany.contact.sections.0.items.4.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): Report a vulnerability. {{TODO: confirm security@ecentic.ai is monitored before activating the contact link}}
- **EN** `enterpriseCompany.contact.sections.0.items.5.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): Data requests and DPA questions. {{TODO: confirm privacy@ecentic.ai is active before activating the contact link}}
- **EN** `enterpriseCompany.contact.sections.1.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: exact legal name and registered address of the Polish operating company}}
- **EN** `enterpriseCompany.contact.sections.1.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: exact legal name and registered address of the Delaware company}}
- **ES** `enterpriseCompany.contact.sections.0.items.3.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar que press@ecentic.ai está activo antes de publicar el contacto de prensa}}
- **ES** `enterpriseCompany.contact.sections.0.items.4.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Comunica una vulnerabilidad. {{TODO: confirmar que security@ecentic.ai se supervisa antes de activar el enlace de contacto}}
- **ES** `enterpriseCompany.contact.sections.0.items.5.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Solicitudes sobre datos y preguntas sobre el DPA. {{TODO: confirmar que privacy@ecentic.ai está activo antes de activar el enlace}}
- **ES** `enterpriseCompany.contact.sections.1.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: nombre legal exacto y domicilio registrado de la empresa operadora polaca}}
- **ES** `enterpriseCompany.contact.sections.1.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: nombre legal exacto y domicilio registrado de la empresa de Delaware}}

### /partners

- **EN** `enterpriseCompany.partners.sections.0.items.0.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): You run Shopify, WooCommerce or marketplace stores for clients. Run ecentic on them, ship the fixes and keep the client relationship. {{TODO: approved agency and reseller benefits and terms}}
- **EN** `enterpriseCompany.partners.sections.0.items.1.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): You sell something different to the same stores: product information, payments, checkout or data. Build on the REST API and MCP server, and sell together. {{TODO: approved technology partner benefits and terms}}
- **EN** `enterpriseCompany.partners.sections.0.items.2.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): You teach people to sell online. Share ecentic with them. {{TODO: approved creator and affiliate benefits and terms}}
- **EN** `enterpriseCompany.partners.sections.1.items.1.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm the proposed 20-minute partner conversation}}
- **EN** `enterpriseCompany.partners.sections.1.items.2.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm partner access, materials and onboarding}}
- **EN** `enterpriseCompany.partners.sections.1.items.3.body` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm the joint selling process}}
- **EN** `enterpriseCompany.partners.faqs.2.answer` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm whether joining the partner programme is free}}
- **ES** `enterpriseCompany.partners.sections.0.items.0.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Gestionas tiendas Shopify, WooCommerce o marketplaces para clientes. Usa ecentic en ellas, aplica las correcciones y conserva la relación con el cliente. {{TODO: beneficios y condiciones aprobados para agencias y distribuidores}}
- **ES** `enterpriseCompany.partners.sections.0.items.1.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Vendes algo diferente a las mismas tiendas: información de producto, pagos, checkout o datos. Desarrolla sobre la API REST y el servidor MCP, y vendamos juntos. {{TODO: beneficios y condiciones aprobados para socios tecnológicos}}
- **ES** `enterpriseCompany.partners.sections.0.items.2.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Enseñas a vender por internet. Comparte ecentic con tu audiencia. {{TODO: beneficios y condiciones aprobados para creadores y afiliados}}
- **ES** `enterpriseCompany.partners.sections.1.items.1.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la conversación propuesta de 20 minutos}}
- **ES** `enterpriseCompany.partners.sections.1.items.2.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar el acceso, los materiales y la incorporación de colaboradores}}
- **ES** `enterpriseCompany.partners.sections.1.items.3.body` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar el proceso de venta conjunta}}
- **ES** `enterpriseCompany.partners.faqs.2.answer` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar si unirse al programa de colaboradores es gratis}}

### /platform/sell

- **EN** `enterprisePlatform.pages.sell.sections.6.note` (`apps/web/messages/fragments/enterprisePlatform.en.json`): {{TODO: Confirm ChatGPT app-directory publication before marking this Live.}}
- **ES** `enterprisePlatform.pages.sell.sections.6.note` (`apps/web/messages/fragments/enterprisePlatform.es.json`): {{TODO: Confirmar la publicación en el directorio de ChatGPT antes de marcarlo como disponible.}}

### /security

- **EN** `enterpriseCompany.security.sections.2.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): Vercel. {{TODO: confirm deployed services and hosting regions}}
- **EN** `enterpriseCompany.security.sections.2.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): PostgreSQL. {{TODO: confirm production provider and region}}
- **EN** `enterpriseCompany.security.sections.2.rows.2.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm the deployed TLS minimum and encryption at rest}}
- **EN** `enterpriseCompany.security.sections.2.rows.5.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm who has production access and whether MFA is enforced}}
- **EN** `enterpriseCompany.security.sections.2.rows.6.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm documented backup and recovery targets}}
- **EN** `enterpriseCompany.security.sections.3.paragraphs.3` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm account-specific provider retention and model-training terms before publishing a no-training promise}}
- **EN** `enterpriseCompany.security.sections.4.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: exact legal name of the Polish operating company}}
- **EN** `enterpriseCompany.security.sections.4.rows.2.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm privacy@ecentic.ai receives data requests before activating the contact link}}
- **EN** `enterpriseCompany.security.sections.5.note` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: supply the approved DPA template and confirmed request contact}}
- **EN** `enterpriseCompany.security.sections.6.note` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm the full contracted sub-processor list and processing locations before launch}}
- **EN** `enterpriseCompany.security.sections.7.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm the security questionnaire process and available review materials}}
- **EN** `enterpriseCompany.security.sections.8.description` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm security@ecentic.ai is monitored before publishing the vulnerability contact}}
- **EN** `enterpriseCompany.security.subprocessors.rows.0.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm Azure region}}
- **EN** `enterpriseCompany.security.subprocessors.rows.1.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.2.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.3.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.4.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm hosting and gateway locations}}
- **EN** `enterpriseCompany.security.subprocessors.rows.5.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm provider and database region}}
- **EN** `enterpriseCompany.security.subprocessors.rows.6.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm Redis region}}
- **EN** `enterpriseCompany.security.subprocessors.rows.7.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.8.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.9.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.10.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **EN** `enterpriseCompany.security.subprocessors.rows.11.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm storage region}}
- **EN** `enterpriseCompany.security.subprocessors.rows.12.location` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm processing location}}
- **ES** `enterpriseCompany.security.sections.2.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): Vercel. {{TODO: confirmar los servicios desplegados y las regiones de alojamiento}}
- **ES** `enterpriseCompany.security.sections.2.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): PostgreSQL. {{TODO: confirmar el proveedor de producción y la región}}
- **ES** `enterpriseCompany.security.sections.2.rows.2.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la versión mínima de TLS desplegada y el cifrado en reposo}}
- **ES** `enterpriseCompany.security.sections.2.rows.5.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar quién tiene acceso a producción y si se exige MFA}}
- **ES** `enterpriseCompany.security.sections.2.rows.6.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar los objetivos documentados de copias de seguridad y recuperación}}
- **ES** `enterpriseCompany.security.sections.3.paragraphs.3` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar las condiciones de retención y entrenamiento de cada cuenta de proveedor antes de prometer que no se usan datos para entrenar modelos}}
- **ES** `enterpriseCompany.security.sections.4.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: nombre legal exacto de la empresa operadora polaca}}
- **ES** `enterpriseCompany.security.sections.4.rows.2.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar que privacy@ecentic.ai recibe solicitudes antes de activar el enlace de contacto}}
- **ES** `enterpriseCompany.security.sections.5.note` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: proporcionar la plantilla de DPA aprobada y el contacto confirmado}}
- **ES** `enterpriseCompany.security.sections.6.note` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la lista completa de subencargados contratados y las ubicaciones de tratamiento antes del lanzamiento}}
- **ES** `enterpriseCompany.security.sections.7.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar el proceso de cuestionarios de seguridad y los materiales disponibles}}
- **ES** `enterpriseCompany.security.sections.8.description` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar que security@ecentic.ai se supervisa antes de publicar el contacto de seguridad}}
- **ES** `enterpriseCompany.security.subprocessors.rows.0.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la región de Azure}}
- **ES** `enterpriseCompany.security.subprocessors.rows.1.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.2.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.3.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.4.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar las ubicaciones de alojamiento y de la pasarela}}
- **ES** `enterpriseCompany.security.subprocessors.rows.5.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar el proveedor y la región de la base de datos}}
- **ES** `enterpriseCompany.security.subprocessors.rows.6.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la región de Redis}}
- **ES** `enterpriseCompany.security.subprocessors.rows.7.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.8.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.9.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.10.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.11.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la región de almacenamiento}}
- **ES** `enterpriseCompany.security.subprocessors.rows.12.location` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar la ubicación de tratamiento}}

### /solutions/agencies-and-partners

- **EN** `enterpriseSolutions.business.agencies-and-partners.challenges.2.after` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Choose a partner track and agree its terms. {{TODO: Confirm agency margin or referral terms.}}
- **EN** `enterpriseSolutions.business.agencies-and-partners.sections.1.items.0.body` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Run product checks for clients, ship verified changes and keep the client relationship. {{TODO: Confirm resale access and commercial terms.}}
- **EN** `enterpriseSolutions.business.agencies-and-partners.sections.1.items.2.body` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Help your audience understand AI commerce. {{TODO: Confirm creator and affiliate payment terms.}}
- **EN** `enterpriseSolutions.business.agencies-and-partners.sections.2.note` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): {{TODO: Confirm the supported agency account setup and client-report sharing terms.}}
- **EN** `enterpriseSolutions.business.agencies-and-partners.faqs.0.answer` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): {{TODO: Confirm the commercial terms for each partner track.}}
- **EN** `enterpriseSolutions.business.agencies-and-partners.faqs.2.answer` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): {{TODO: Confirm client-report sharing terms. No white-label report capability is claimed.}}
- **ES** `enterpriseSolutions.business.agencies-and-partners.challenges.2.after` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Elige una modalidad y acuerda sus condiciones. {{TODO: Confirmar margen de agencia o condiciones de recomendación.}}
- **ES** `enterpriseSolutions.business.agencies-and-partners.sections.1.items.0.body` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Analiza productos de clientes, aplica cambios verificados y mantén la relación. {{TODO: Confirmar acceso de reventa y condiciones comerciales.}}
- **ES** `enterpriseSolutions.business.agencies-and-partners.sections.1.items.2.body` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Ayuda a tu audiencia a entender el comercio con IA. {{TODO: Confirmar condiciones de pago para creadores y afiliados.}}
- **ES** `enterpriseSolutions.business.agencies-and-partners.sections.2.note` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): {{TODO: Confirmar la configuración de cuentas para agencias y las condiciones para compartir informes.}}
- **ES** `enterpriseSolutions.business.agencies-and-partners.faqs.0.answer` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): {{TODO: Confirmar las condiciones comerciales de cada modalidad.}}
- **ES** `enterpriseSolutions.business.agencies-and-partners.faqs.2.answer` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): {{TODO: Confirmar condiciones para compartir informes. No se afirma que haya informes de marca blanca.}}

### /solutions/enterprise

- **EN** `enterpriseSolutions.business.enterprise.sections.2.items.0.body` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Agree the questions and run the baseline before changing data. {{TODO: Confirm the proposed 25 questions and three runs per assistant.}}
- **EN** `enterpriseSolutions.business.enterprise.sections.4.rows.2.value` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): {{TODO: Confirm expected weekly time from the business owner.}}
- **EN** `enterpriseSolutions.business.enterprise.sections.5.items.1.body` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Review data handling, the DPA request route and the dated sub-processor list. {{TODO: Confirm operational security facts and contracting entity before launch.}}
- **EN** `enterpriseSolutions.business.enterprise.sections.7.rows.1.value` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Only through actions you authorize after connecting a store. Public-data recommendations go to your team. {{TODO: Confirm pilot delivery formats.}}
- **EN** `enterpriseSolutions.business.enterprise.sections.7.rows.6.value` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): {{TODO: Confirm NDA policy before any non-public data is shared.}}
- **EN** `enterpriseSolutions.business.enterprise.faqs.1.answer` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Product scans run on ChatGPT, Claude and Gemini. {{TODO: Confirm the assistants and collection method for bespoke pilot questions.}}
- **EN** `enterpriseSolutions.business.enterprise.faqs.4.answer` (`apps/web/messages/fragments/enterpriseSolutions.en.json`): Not yet. {{TODO: Confirm the compliance roadmap and available security materials.}} We do not claim a certification or an existing security pack.
- **ES** `enterpriseSolutions.business.enterprise.sections.2.items.0.body` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Acuerda preguntas y ejecuta la referencia antes de cambiar datos. {{TODO: Confirmar las 25 preguntas propuestas y tres ejecuciones por asistente.}}
- **ES** `enterpriseSolutions.business.enterprise.sections.4.rows.2.value` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): {{TODO: Confirmar el tiempo semanal esperado del responsable.}}
- **ES** `enterpriseSolutions.business.enterprise.sections.5.items.1.body` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Consulta el tratamiento de datos, la solicitud de DPA y la lista fechada de subencargados. {{TODO: Confirmar seguridad operativa y entidad contratante antes del lanzamiento.}}
- **ES** `enterpriseSolutions.business.enterprise.sections.7.rows.1.value` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Solo mediante acciones autorizadas tras conectar una tienda. Las recomendaciones públicas se entregan a tu equipo. {{TODO: Confirmar formatos de entrega.}}
- **ES** `enterpriseSolutions.business.enterprise.sections.7.rows.6.value` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): {{TODO: Confirmar la política de NDA antes de compartir datos no públicos.}}
- **ES** `enterpriseSolutions.business.enterprise.faqs.1.answer` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Los análisis de productos usan ChatGPT, Claude y Gemini. {{TODO: Confirmar asistentes y método para preguntas específicas del piloto.}}
- **ES** `enterpriseSolutions.business.enterprise.faqs.4.answer` (`apps/web/messages/fragments/enterpriseSolutions.es.json`): Todavía no. {{TODO: Confirmar el plan de cumplimiento y los materiales de seguridad disponibles.}} No afirmamos tener una certificación ni un paquete de seguridad existente.

### /stories/dua-flavours

- **EN** `enterpriseCompany.duaFlavours.sections.0.rows.3.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: describe what ecentic changed for DUA Flavours}}
- **EN** `enterpriseCompany.duaFlavours.sections.1.paragraphs.0` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: DUA Flavours’ starting position, supplied and approved by Xhurian}}
- **EN** `enterpriseCompany.duaFlavours.sections.2.paragraphs.0` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: name the products and fields changed, and when the work happened}}
- **EN** `enterpriseCompany.duaFlavours.sections.4.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: explain the April start and what ecentic did before the Shopify app launched on 20 May 2026}}
- **ES** `enterpriseCompany.duaFlavours.sections.0.rows.3.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: describir qué cambió ecentic para DUA Flavours}}
- **ES** `enterpriseCompany.duaFlavours.sections.1.paragraphs.0` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: situación inicial de DUA Flavours, proporcionada y aprobada por Xhurian}}
- **ES** `enterpriseCompany.duaFlavours.sections.2.paragraphs.0` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: indicar los productos y campos modificados y cuándo se hizo el trabajo}}
- **ES** `enterpriseCompany.duaFlavours.sections.4.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: explicar el inicio en abril y qué hizo ecentic antes del lanzamiento de la app de Shopify el 20 de mayo de 2026}}

### Private research template

- **EN** `enterpriseCompany.researchDraft.sections.0.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: confirm whether all products in the research were real products}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: number of products}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: categories represented}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.2.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: question set and selection method}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.3.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: runs per question and total allocation}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.4.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: models and exact versions}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.5.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: research dates}}
- **EN** `enterpriseCompany.researchDraft.sections.2.rows.6.value` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: definition of a simulated purchase}}
- **EN** `enterpriseCompany.researchDraft.sections.3.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: add only further findings supported by the research data}}
- **EN** `enterpriseCompany.researchDraft.sections.6.description` (`apps/web/messages/fragments/enterpriseCompany.en.json`): {{TODO: supply the final, reviewed PDF before enabling its download}}
- **EN** `enterpriseCompany.researchDraft.sections.7.description` (`apps/web/messages/fragments/enterpriseCompany.en.json`): ecentic, “36,797 simulated AI purchases”, {{TODO: publication month}} 2026.
- **ES** `enterpriseCompany.researchDraft.sections.0.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: confirmar si todos los productos de la investigación eran reales}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.0.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: número de productos}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.1.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: categorías representadas}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.2.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: preguntas y método de selección}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.3.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: ejecuciones por pregunta y distribución total}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.4.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: modelos y versiones exactas}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.5.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: fechas de la investigación}}
- **ES** `enterpriseCompany.researchDraft.sections.2.rows.6.value` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: definición de compra simulada}}
- **ES** `enterpriseCompany.researchDraft.sections.3.paragraphs.1` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: añadir solo resultados adicionales respaldados por los datos de la investigación}}
- **ES** `enterpriseCompany.researchDraft.sections.6.description` (`apps/web/messages/fragments/enterpriseCompany.es.json`): {{TODO: proporcionar el PDF final revisado antes de activar su descarga}}
- **ES** `enterpriseCompany.researchDraft.sections.7.description` (`apps/web/messages/fragments/enterpriseCompany.es.json`): ecentic, “36.797 compras simuladas con IA”, {{TODO: mes de publicación}} de 2026.

### Shared navigation/footer

- **EN** `enterpriseChrome.footer.copyright` (`apps/web/messages/fragments/enterpriseChrome.en.json`): © 2026 {{TODO: legal name of the Polish operating company}}
- **ES** `enterpriseChrome.footer.copyright` (`apps/web/messages/fragments/enterpriseChrome.es.json`): © 2026 {{TODO: nombre legal de la empresa operadora polaca}}

## Unconverted instruction-style brackets

No hits.

## Existing content and intended exceptions

- Terms and Privacy text was left unchanged. Both legal fragments name zennit at lines 62, 157, 161 and 189. Their inherited product claims, typography, legal entity names and retention text require the separate legal review described in the delivery report; they were not rewritten to make a grep check pass.
- Published blog posts stay live for search. Their existing SEO/GEO and other legacy wording is not new marketing copy. The index now sorts `source=local` hand-written posts first in both locales, then preserves publication-date ordering within each group. No post is deleted, hidden or rewritten.
- Product feature names such as Brand Visibility can remain with a clear, code-backed description. The category statement that ecentic is not an SEO or GEO tool and the homepage SEO FAQ are expected exceptions.
- Program participation, EU Presence and partner-program wording must not be read as an unverified Google/Microsoft/OpenAI endorsement. Feature status and proof remain governed by the capability audit.
- This static report does not replace rendered-page checks. Canonical OpenAPI schemas contain existing protocol descriptions in code blocks, and they are outside the new-fragment scan.

## Related verification

- `/tmp/ecentic-enterprise-final-trust-report.md` contains security/legal/attribution limits.
- `/tmp/ecentic-enterprise-rebuild/route-audit.json` contains HTTP, headings, metadata, redirects and link checks.
- `/tmp/ecentic-enterprise-rebuild/lighthouse/` contains accessibility and initial development-only performance reports.
