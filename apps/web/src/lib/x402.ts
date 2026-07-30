import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { Network, RouteConfig } from "@x402/next";
import { x402ResourceServer } from "@x402/next";

/**
 * Default: Base Sepolia — the only EVM network the public
 * `https://x402.org/facilitator` supports without CDP auth.
 * For Base mainnet (`eip155:8453`) set `X402_NETWORK` and point
 * `X402_FACILITATOR_URL` at the CDP facilitator with API keys.
 * @see https://docs.cdp.coinbase.com/x402/network-support
 */
const defaultNetwork = "eip155:84532" as const;

export const x402FacilitatorUrl = () =>
  process.env.X402_FACILITATOR_URL?.trim() || "https://x402.org/facilitator";

export const resolveX402Network = (): Network => {
  const configured = process.env.X402_NETWORK?.trim();
  if (configured && /^[a-z0-9]+:[a-zA-Z0-9]+$/.test(configured)) {
    return configured as Network;
  }
  return defaultNetwork;
};

/**
 * Receiving wallet for USDC. Discovery still works with the zero address;
 * set `X402_PAY_TO` before expecting real settlement.
 */
export const resolveX402PayTo = (): `0x${string}` => {
  const configured = process.env.X402_PAY_TO?.trim();
  if (configured && /^0x[a-fA-F0-9]{40}$/.test(configured)) {
    return configured as `0x${string}`;
  }
  return "0x0000000000000000000000000000000000000000";
};

const facilitator = new HTTPFacilitatorClient({
  url: x402FacilitatorUrl(),
});

/**
 * Shared x402 resource server (exact scheme via the configured facilitator).
 * @see https://docs.x402.org
 */
export const x402Server = new x402ResourceServer(facilitator).register(
  resolveX402Network(),
  new ExactEvmScheme(),
);

/** Payment terms for `GET /api` — agent-native HTTP micropayments. */
export const x402AgentApiRoute = (): RouteConfig => ({
  accepts: {
    scheme: "exact",
    price: "$0.01",
    network: resolveX402Network(),
    payTo: resolveX402PayTo(),
    maxTimeoutSeconds: 60,
  },
  description: "ecentic agent API access",
  mimeType: "application/json",
});
