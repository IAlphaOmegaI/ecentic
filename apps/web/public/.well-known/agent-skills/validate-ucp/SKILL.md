---
name: validate-ucp
description: Validate a storefront Universal Commerce Protocol (UCP) profile at /.well-known/ucp. Use when checking UCP reachability, schema correctness, or whether AI shopping agents can discover a merchant.
when_to_use: Use when checking whether a storefront's Universal Commerce Protocol profile is reachable, schema-correct, and discoverable by AI shopping agents.
---

# Validate a UCP Profile

Use ecentic's free UCP Validator and Playground to inspect any storefront's Universal Commerce Protocol setup.

## When to use

- Confirm `GET https://{store}/.well-known/ucp` returns a valid profile
- Debug UCP schema errors, capability keys, or transport endpoints
- Smoke-test catalog search → cart → checkout against a live store

## When not to use

- Optimizing a listing for agent comparison — that is [optimize-listings](https://ecentic.ai/.well-known/agent-skills/optimize-listings/SKILL.md)
- Connecting a store to ecentic — that is [agent-commerce](https://ecentic.ai/.well-known/agent-skills/agent-commerce/SKILL.md)
- Validating a protocol other than UCP; ecentic also publishes ACP and MCP surfaces but this skill checks UCP only

## Workflow

1. Open https://ecentic.ai/ucp-validator
2. Enter the store's public HTTPS domain (no path)
3. Review reachability, JSON parse, schema errors/warnings, and robots.txt agent access
4. For live tool calls, open https://ecentic.ai/ucp-playground and run the MCP/REST shopping flow

## Discovery expectations

- UCP discovery is a plain HTTPS GET to `/.well-known/ucp` (no `UCP-Agent` header on discovery)
- Service endpoints must be HTTPS with no trailing slash
- Capability keys use reverse-domain form (`dev.ucp.shopping.*`)

## Key URLs

- Validator: https://ecentic.ai/ucp-validator
- Playground: https://ecentic.ai/ucp-playground
- ecentic UCP profile: https://ecentic.ai/.well-known/ucp
- Agent profile: https://ecentic.ai/ucp/agent-profile
