import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { Environment } from "@/server/utils/environment";

// Sends the merchant back to settings with a machine-readable reason instead
// of stranding them on this JSON endpoint. Mirrors the Shopify callback.
const settingsPage = (query: string) =>
  `${process.env.APP_HOST}/dashboard/settings?${query}`;

export const GET = async (request: NextRequest) => {
  if (!process.env.APP_HOST)
    return Response.json(
      { error: "Google Merchant integration not configured" },
      { status: 500 },
    );

  const params = request.nextUrl.searchParams;

  const code = params.get("code");
  const state = params.get("state");

  const jar = await cookies();
  const nonce = jar.get("google_nonce")?.value;
  const store = jar.get("google_store")?.value;

  // The merchant declining the Google consent screen arrives as ?error=...
  if (params.get("error"))
    return Response.redirect(settingsPage("google=declined"));

  if (!code || !state || !store)
    return Response.redirect(settingsPage("google=missing_parameters"));

  if (state !== nonce)
    return Response.redirect(settingsPage("google=invalid_state"));

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.redirect(`${process.env.APP_HOST}/sign-in`);

  const result = await GoogleMerchant.handleOAuthCallback(Environment.SERVER, {
    code,
    store,
    user: session.user.id,
  });

  jar.delete("google_nonce");
  jar.delete("google_store");

  if (!result.success)
    return Response.redirect(settingsPage("google=integration_failed"));

  // `adopted` = exactly one Merchant Center account was visible and taken as
  // the store's account. Otherwise the settings UI either offers a picker
  // (several accounts) or holds on the "install the Google plugin" step (none).
  return Response.redirect(
    settingsPage(result.data.adopted ? "google=connected" : "google=detect"),
  );
};
