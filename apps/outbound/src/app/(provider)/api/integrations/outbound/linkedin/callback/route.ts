import { timingSafeEqual } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { defaultLocale, isLocale } from "@/i18n/locales";
import { auth } from "@/lib/auth";
import * as Accounts from "@/server/app/outbound/linkedin-accounts";
import * as Users from "@/server/app/user";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import * as Unipile from "@/server/utils/outbound/unipile";

const stateSchema = z.object({
  state: z.string().min(32).max(256),
  actor: z.string(),
  locale: z.string().refine(isLocale),
  accountId: z.string().min(1).max(200).optional(),
});

export const GET = async (request: NextRequest) => {
  const jar = await cookies();
  const saved = jar.get("ecentic_outbound_unipile_auth")?.value;
  jar.set("ecentic_outbound_unipile_auth", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/outbound/linkedin",
    maxAge: 0,
  });
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  const user = session
    ? await Users.get(Environment.SERVER, session.user.id)
    : null;
  if (!session || !user?.success || !isInternalStaff(user.data?.role))
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 },
    );
  const parsed = resultify(() =>
    stateSchema.parse(JSON.parse(saved ?? "null")),
  );
  const state = request.nextUrl.searchParams.get("state") ?? "";
  if (
    !parsed.success ||
    parsed.data.actor !== session.user.id ||
    Buffer.byteLength(state) !== Buffer.byteLength(parsed.data.state) ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(parsed.data.state))
  )
    return NextResponse.json(
      { error: "Connection expired. Start again from Integrations." },
      { status: 400 },
    );

  const destination = new URL(
    parsed.data.locale === defaultLocale
      ? "/integrations"
      : `/${parsed.data.locale}/integrations`,
    process.env.APP_HOST,
  );
  if (request.nextUrl.searchParams.has("error_title")) {
    destination.searchParams.set("linkedin", "declined");
    return NextResponse.redirect(destination);
  }
  const accountId = request.nextUrl.searchParams.get("account_id");
  if (
    !accountId ||
    request.nextUrl.searchParams.get("provider") !== "linkedin" ||
    (parsed.data.accountId && parsed.data.accountId !== accountId)
  )
    return NextResponse.json(
      { error: "LinkedIn account did not match the connection." },
      { status: 400 },
    );
  const account = await Unipile.getAccount(accountId);
  if (!account.success)
    return NextResponse.json(
      { error: account.error.message },
      { status: account.error.statusCode },
    );
  if (account.data.id !== accountId || account.data.provider !== "linkedin")
    return NextResponse.json(
      { error: "LinkedIn account could not be verified." },
      { status: 409 },
    );
  const connected = await Accounts.save(session.user.id, account.data);
  if (!connected.success)
    return NextResponse.json(
      { error: connected.error.message },
      { status: 409 },
    );
  destination.searchParams.set("linkedin", "connected");
  return NextResponse.redirect(destination);
};
