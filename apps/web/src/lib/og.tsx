import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const background = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/images/background.png"),
).toString("base64")}`;

const medium = readFileSync(
  join(process.cwd(), "public/fonts/LTSuperior/LTSuperior-Medium.ttf"),
);

const semibold = readFileSync(
  join(process.cwd(), "public/fonts/LTSuperior/LTSuperior-SemiBold.ttf"),
);

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export const ogImageSize = { width: 1200, height: 630 } as const;
export const ogImageContentType = "image/png" as const;

// Satori has no calc(): the column's negative margins pull it past the frame's
// horizontal rules, so its height is the full canvas minus those two hairlines.
const columnHeight = ogImageSize.height - 2;

export const createOgImage = ({ title, description }: createOgImage.Params) => {
  const displayTitle = truncate(title || "ecentic", 110);
  const displayDescription = truncate(
    description || "Infrastructure for the agent economy",
    180,
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "44px 0",
        backgroundColor: "#1572fa",
        color: "#0a0a0a",
        fontFamily: "LTSuperior",
        position: "relative",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: next/og Satori only supports plain img elements */}
      <img
        src={background}
        width={1200}
        height={630}
        alt="Background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          objectFit: "cover",
        }}
      />

      <section
        style={{
          borderTop: "1px solid white",
          borderBottom: "1px solid white",
          width: "100%",
          height: "100%",
          padding: "0 44px",
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            gap: 24,
            height: columnHeight,
            borderLeft: "1px solid white",
            borderRight: "1px solid white",
            margin: "-44px 0",
            padding: "74px 30px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              position: "relative",
              marginBottom: "auto",
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              ecentic
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              position: "relative",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 72,
                letterSpacing: "-0.035em",
                fontWeight: 600,
                color: "#ffffff",
                maxWidth: 880,
              }}
            >
              {displayTitle}
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: 28,
                color: "white",
                letterSpacing: "-0.01em",
                maxWidth: 980,
                fontWeight: 200,
                marginTop: -8,
              }}
            >
              {displayDescription}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 22,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "-0.01em",
              position: "relative",
            }}
          >
            <span>ecentic.ai</span>
            <span>Win every AI agent's cart</span>
          </div>
        </section>
      </section>
    </div>,
    {
      ...ogImageSize,
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
    },
  );
};

export namespace createOgImage {
  export type Params = {
    title: string;
    description: string;
  };
}
