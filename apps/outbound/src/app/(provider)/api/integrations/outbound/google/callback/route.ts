import { timingSafeEqual } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { defaultLocale, isLocale } from "@/i18n/locales";
import { auth } from "@/lib/auth";
import * as Mailboxes from "@/server/app/outbound/transport-store";
import * as Users from "@/server/app/user";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import * as Google from "@/server/utils/outbound/google";

const stateSchema = z.object({
  state: z.string().min(32).max(256),
  verifier: z.string().min(43).max(128),
  actor: z.string(),
  locale: z.string().refine(isLocale),
});

export const GET = async (request: NextRequest) => {
  const jar = await cookies();
  const saved = jar.get("ecentic_outbound_google_oauth")?.value;
  jar.set("ecentic_outbound_google_oauth", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/outbound/google",
    maxAge: 0,
  });
  const session = await auth.api.getSession({ headers: request.headers });
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
      {
        error:
          "OAuth state expired or did not match. Start the connection again.",
      },
      { status: 400 },
    );
  const destination = new URL(
    parsed.data.locale === defaultLocale
      ? "/integrations"
      : `/${parsed.data.locale}/integrations`,
    request.url,
  );
  if (request.nextUrl.searchParams.has("error")) {
    destination.searchParams.set("google", "declined");
    return NextResponse.redirect(destination);
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code)
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 },
    );
  const token = await Google.exchangeCode({
    code,
    codeVerifier: parsed.data.verifier,
  });
  if (!token.success)
    return NextResponse.json({ error: token.error.message }, { status: 502 });
  const profile = await Google.getProfile({
    accessToken: token.data.accessToken,
  });
  if (!profile.success)
    return NextResponse.json({ error: profile.error.message }, { status: 502 });
  const connected = await Mailboxes.connect(
    session.user.id,
    token.data,
    profile.data,
  );
  if (!connected.success)
    return NextResponse.json(
      { error: connected.error.message },
      { status: 409 },
    );
  destination.searchParams.set("google", "connected");
  return NextResponse.redirect(destination);
};
