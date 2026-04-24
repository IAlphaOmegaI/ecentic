import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const loadFont = async (request: NextRequest, path: string) => {
  const response = await fetch(new URL(path, request.url));
  return response.arrayBuffer();
};

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const title = truncate(searchParams.get("title")?.trim() || "écentic", 110);
  const eyebrow = truncate(
    searchParams.get("eyebrow")?.trim() ||
      "Infrastructure for the agent economy",
    48,
  );
  const description = searchParams.get("description")?.trim();
  const descriptionText = description ? truncate(description, 180) : null;

  const [medium, semibold] = await Promise.all([
    loadFont(request, "/fonts/LTSuperior/LTSuperior-Medium.ttf"),
    loadFont(request, "/fonts/LTSuperior/LTSuperior-SemiBold.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle at 85% 15%, rgba(21,114,250,0.22), transparent 55%), radial-gradient(circle at 10% 90%, rgba(21,114,250,0.12), transparent 60%)",
        color: "#fafafa",
        fontFamily: "LTSuperior",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid rgba(250,250,250,0.08)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: "#1572fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0a0a0a",
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          é
        </div>
        <span
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          écentic
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <span
          style={{
            fontSize: 20,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#1572fa",
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 72,
            lineHeight: 1.06,
            letterSpacing: "-0.035em",
            fontWeight: 600,
            maxWidth: 980,
          }}
        >
          {title}
        </h1>
        {descriptionText && (
          <p
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(250,250,250,0.7)",
              letterSpacing: "-0.01em",
              maxWidth: 940,
              fontWeight: 400,
            }}
          >
            {descriptionText}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "rgba(250,250,250,0.55)",
          fontSize: 22,
          letterSpacing: "-0.01em",
        }}
      >
        <span>ecentic.ai</span>
        <span>Win every AI agent's cart</span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "LTSuperior",
          data: medium,
          style: "normal",
          weight: 500,
        },
        {
          name: "LTSuperior",
          data: semibold,
          style: "normal",
          weight: 600,
        },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
};
