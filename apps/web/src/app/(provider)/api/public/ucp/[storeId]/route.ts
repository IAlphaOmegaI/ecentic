import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/database";
import { schema } from "@/server/database";
import { buildMerchantDocument } from "@/server/ucp/build-merchant";

const corsHeaders = (): Record<string, string> => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
});

/**
 * Public UCP merchant document for a connected store.
 * Authenticate with the same `trackerApiKey` as storefront beacons:
 * `Authorization: Bearer <trackerApiKey>` or `?k=<trackerApiKey>`.
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) => {
  const { storeId } = await params;
  const url = new URL(request.url);
  const qp = url.searchParams.get("k") ?? "";
  const header = request.headers.get("authorization");
  const bearer =
    header?.toLowerCase().startsWith("bearer ") === true
      ? header.slice(7).trim()
      : "";
  const token = bearer || qp;

  const storeRows = await db
    .select()
    .from(schema.store)
    .where(eq(schema.store.id, storeId))
    .limit(1);

  const store = storeRows[0];
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!store.trackerApiKey || token !== store.trackerApiKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() },
    );
  }

  const userId = store.userId;

  const [profileRows, productRows] = await Promise.all([
    db
      .select()
      .from(schema.ucpProfile)
      .where(eq(schema.ucpProfile.userId, userId))
      .limit(1),
    db
      .select()
      .from(schema.product)
      .where(eq(schema.product.userId, userId)),
  ]);

  try {
    const doc = buildMerchantDocument({
      profile: profileRows[0] ?? null,
      products: productRows,
    });

    return NextResponse.json(doc, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        ...corsHeaders(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "UCP document could not be built" },
      { status: 500, headers: corsHeaders() },
    );
  }
};

export const OPTIONS = () =>
  new NextResponse(null, { status: 204, headers: corsHeaders() });
