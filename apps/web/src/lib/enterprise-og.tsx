import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const asset = (path: string, type: string) =>
  `data:${type};base64,${readFileSync(join(process.cwd(), "public", path)).toString("base64")}`;
const lockup = asset("images/marketing/trademark-on-dark.svg", "image/svg+xml");
const artwork = asset("images/marketing/og-ascii.png", "image/png");
const font = readFileSync(
  join(process.cwd(), "public/fonts/LTSuperior/LTSuperior-Medium.ttf"),
);

const bodyFont = readFileSync(
  join(process.cwd(), "public/fonts/marketing/RedHatDisplay-Regular.ttf"),
);

export const enterpriseOgSize = { width: 1200, height: 630 } as const;
export const enterpriseOgContentType = "image/png";

export const createEnterpriseOgImage = ({
  title,
  description,
  signoff,
}: {
  title: string;
  description: string;
  signoff: string;
}) =>
  new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(180deg, #111111 25%, #092645 72%, #005fd6 100%)",
        color: "white",
        position: "relative",
        fontFamily: "LTSuperior",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: Satori renders an image response, not a browser document. */}
      <img
        src={artwork}
        alt=""
        width={900}
        height={600}
        style={{
          position: "absolute",
          right: -150,
          top: 35,
          objectFit: "contain",
          opacity: 0.36,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(17,17,17,.85), rgba(17,17,17,.7) 50%, rgba(17,17,17,0))",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          margin: "0 48px",
          padding: "48px 28px",
          width: 1104,
          borderLeft: "1px solid #7d8590",
          borderRight: "1px solid #7d8590",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 26,
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: Preserve the official lockup paths in the generated social image. */}
          <img src={lockup} alt="ecentic" width={180} height={45} />
          <span style={{ fontSize: 20, color: "#9ac5ff" }}>ecentic.ai</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 26,
            paddingBottom: 22,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: title.length > 66 ? 56 : 68,
              fontWeight: 500,
              letterSpacing: "-.04em",
              lineHeight: 1.04,
              maxWidth: 960,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: "RedHatDisplay",
              fontSize: 25,
              lineHeight: 1.35,
              color: "rgba(255,255,255,.82)",
              maxWidth: 940,
            }}
          >
            {description}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "RedHatDisplay",
            fontSize: 20,
            opacity: 0.82,
          }}
        >
          {title === signoff ? "ecentic.ai" : signoff}
        </div>
      </div>
      {[119, 581].map((top) => (
        <div
          key={top}
          style={{
            display: "flex",
            position: "absolute",
            top,
            left: 0,
            width: 1200,
            height: 1,
            background: "#7d8590",
          }}
        />
      ))}
      {[48, 1152].flatMap((left) =>
        [119, 581].map((top) => (
          <div
            key={`${left}-${top}`}
            style={{
              display: "flex",
              position: "absolute",
              left: left - 8,
              top: top - 8,
              width: 16,
              height: 16,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 7,
                width: 16,
                height: 1,
                background: "#7d8590",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 7,
                height: 16,
                width: 1,
                background: "#7d8590",
              }}
            />
          </div>
        )),
      )}
    </div>,
    {
      ...enterpriseOgSize,
      fonts: [
        { name: "LTSuperior", data: font, weight: 500, style: "normal" },
        { name: "RedHatDisplay", data: bodyFont, weight: 400, style: "normal" },
      ],
    },
  );
