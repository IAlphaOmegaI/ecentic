import type { NextRequest } from "next/server";
import { handleUcpRequest } from "@/server/app/ucp/router";

/**
 * Hosted UCP REST surface for a connected store. The store's discovery
 * profile (served by its plugin at `/.well-known/ucp`) advertises
 * `/api/ucp/stores/{store}` as the `dev.ucp.shopping` endpoint, so AI agent
 * platforms call catalog/cart/checkout/order operations here directly.
 */

type RouteContext = {
  params: Promise<{ store: string; path?: string[] }>;
};

const handle = async (request: NextRequest, context: RouteContext) => {
  const { store, path } = await context.params;
  return handleUcpRequest(request, store, path ?? []);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const OPTIONS = handle;
