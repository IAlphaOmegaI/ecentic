---
name: agent-commerce
description: Connect a Shopify or WooCommerce store to ecentic, measure AI agent traffic, and improve agent-driven commerce readiness. Use when setting up agent tracking, UCP hosting, or catalog sync.
when_to_use: Use when connecting a Shopify, WooCommerce, or feed-backed store to ecentic, hosting a UCP profile for it, or measuring which AI assistants visit its catalog.
---

# Agent Commerce with ecentic

ecentic helps merchants sell when AI agents do the shopping: connect the catalog, simulate agent decisions, fix listings, set the store up for agent checkout, and measure AI-referred visits on Shopify.

## When to use

- Onboarding a Shopify or WooCommerce store for AI agent commerce
- Setting a store up for agent checkout: hosted UCP through the ecentic plugin on WooCommerce, Google Merchant Center sync and checkout settings on Shopify
- Measuring which AI assistants send visitors to a Shopify storefront
- Evaluating MCP tools exposed at https://ecentic.ai/api/mcp

## When not to use

- Optimizing listing copy or attributes — that is [optimize-listings](https://ecentic.ai/.well-known/agent-skills/optimize-listings/SKILL.md)
- Validating another merchant's UCP profile — that is [validate-ucp](https://ecentic.ai/.well-known/agent-skills/validate-ucp/SKILL.md)
- Building or hosting a storefront; ecentic connects to one the merchant already runs
- Order fulfilment, inventory management, or ad campaigns

## Workflow

1. Create an account at https://ecentic.ai/sign-up
2. Connect the store during onboarding: the Shopify app, the WooCommerce plugin or REST keys, or a product feed
3. Confirm catalog import completed (products appear in the dashboard)
4. Run simulations and listing optimizations on priority SKUs
5. On Shopify, visit tracking installs with the app and Google Merchant Center connects from the dashboard; on WooCommerce, the ecentic plugin serves `/.well-known/ucp` for agent checkout
6. Use https://ecentic.ai/resources for free validators and developer surfaces

## Machine-readable surfaces

- Site overview: https://ecentic.ai/llms.txt
- UCP profile: https://ecentic.ai/.well-known/ucp
- MCP endpoint: https://ecentic.ai/api/mcp
- Agent skills index: https://ecentic.ai/.well-known/agent-skills/index.json

## Platform guides

- Shopify: https://ecentic.ai/platforms/shopify
- WooCommerce: https://ecentic.ai/platforms/woocommerce
- Enterprise: https://ecentic.ai/enterprise
