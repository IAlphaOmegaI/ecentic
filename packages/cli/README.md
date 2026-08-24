# @ecentic/cli

Official command line interface for the [ecentic](https://ecentic.ai) agent API.

ecentic measures and improves how AI shopping agents — ChatGPT, Claude, Gemini,
Perplexity — rank a merchant's products against competitors. This CLI wraps the
public API and the MCP endpoint so an agent or a developer can script it without
building an HTTP integration.

## Install

```bash
npx @ecentic/cli --help
# or
npm install -g @ecentic/cli
```

Requires Node 20 or newer. No runtime dependencies.

## Use

Every command prints JSON on stdout, so everything composes with `jq`.

```bash
ecentic api                       # index of the public API
ecentic discovery                 # every protocol and machine-readable document
ecentic plans                     # public plan catalog
ecentic skills                    # published agent skills
ecentic health                    # service health
ecentic openapi                   # OpenAPI 3.1 document

ecentic tools                     # MCP tools/list
ecentic mcp tools/call '{"name":"list_plans","arguments":{}}'
```

```bash
ecentic plans | jq '.plans[] | {key, price}'
```

## Authentication

Public commands need no credential. Anything that touches a merchant account
takes a bearer key:

```bash
export ECENTIC_API_KEY=ecentic_sk_...
ecentic mcp tools/call '{"name":"get_onboarding_status","arguments":{}}'
```

Mint a key from the ecentic dashboard or through the authenticated MCP tool
`create_api_key` — see <https://ecentic.ai/auth.md>.

## Options

| Option | Meaning |
| --- | --- |
| `--host <url>` | Override the API host (default `https://ecentic.ai`). Also `ECENTIC_HOST`. |
| `--api-key <key>` | Bearer key. Also `ECENTIC_API_KEY`. |
| `--raw` | Compact JSON instead of indented. |
| `--help`, `-h` | Usage. |
| `--version`, `-v` | CLI version. |

## Errors and rate limits

A failed call prints the API's RFC 9457 problem document — its machine-readable
`code`, what went wrong, and how to resolve it — on stderr, and exits non-zero.
Rate-limit state is summarised on stderr too, so stdout stays parseable.

Exit codes: `0` success, `1` request failed, `2` usage error.

- Errors: <https://ecentic.ai/docs/errors>
- Rate limits: <https://ecentic.ai/docs/rate-limits>
- Versioning: <https://ecentic.ai/docs/versioning>

## Documentation

<https://ecentic.ai/docs>

## License

MIT
