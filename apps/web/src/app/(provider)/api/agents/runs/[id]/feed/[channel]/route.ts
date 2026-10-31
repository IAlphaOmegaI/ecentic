import { resultify } from "@zenncore/utils";
import { type NextRequest, NextResponse } from "next/server";
import * as Run from "@/server/app/storefront/run";

type RouteContext = {
  params: Promise<{ id: string; channel: string }>;
};

const HEADERS = { "Cache-Control": "no-store" };

/** `google` as RSS XML, `chatgpt` as CSV in OpenAI's product file schema. */
export const GET = async (_: NextRequest, context: RouteContext) => {
  const { id, channel } = await context.params;

  const file = await resultify(() => Run.feed(id, channel));
  if (!file.success)
    return NextResponse.json(
      { error: "Could not build this feed" },
      { status: 503, headers: HEADERS },
    );
  if (!file.data)
    return NextResponse.json(
      { error: "No such feed" },
      { status: 404, headers: HEADERS },
    );

  return new NextResponse(file.data.body, {
    headers: {
      ...HEADERS,
      "Content-Type": file.data.type,
      "Content-Disposition": `attachment; filename="${file.data.filename}"`,
    },
  });
};
