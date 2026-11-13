import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n/locales";
import { cjkOgFont } from "./og-fonts";
import { ogTextLayout } from "./og-layout";

const asset = (path: string, type: string) =>
  `data:${type};base64,${readFileSync(join(process.cwd(), "public", path)).toString("base64")}`;
const lockup = asset("images/marketing/trademark-on-dark.svg", "image/svg+xml");
const artwork = asset("images/marketing/og-commerce.png", "image/png");
const headingFont = readFileSync(
  join(process.cwd(), "public/fonts/LTSuperior/LTSuperior-Medium.ttf"),
);
const bodyFont = readFileSync(
  join(process.cwd(), "public/fonts/marketing/RedHatDisplay-Regular.ttf"),
);

export const ogImageSize = { width: 1200, height: 630 } as const;
export const ogImageContentType = "image/png" as const;

/** Satori uses literal values corresponding to the design canon's dark surface and primary tokens. */
export const createOgImage = ({
  title,
  description,
  locale,
}: createOgImage.Params) => {
  const layout = ogTextLayout(title, description, locale);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        background:
          "linear-gradient(125deg, #080b10 35%, #0b1930 76%, #123d78 100%)",
        color: "#f5f7fb",
        fontFamily: "LTSuperior, NotoSansCJK",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 0,
          top: 113,
          width: 448,
          height: 468,
          background:
            "radial-gradient(ellipse at 78% 78%, rgba(21,114,250,.3), rgba(21,114,250,0) 72%)",
        }}
      />
      {/* biome-ignore lint/performance/noImgElement: Satori renders raster assets, not browser image components. */}
      <img
        src={artwork}
        alt=""
        width={600}
        height={400}
        style={{
          position: "absolute",
          left: 652,
          top: 157,
          width: 600,
          height: 400,
          objectFit: "contain",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 78,
          right: 78,
          top: 37,
          height: 40,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: Preserve the official logo paths in the social image. */}
        <img src={lockup} alt="ecentic" width={168} height={42} />
        <span
          style={{
            fontFamily: "RedHatDisplay, NotoSansCJK",
            fontSize: 21,
            color: "#a4b2c5",
          }}
        >
          ecentic.ai
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "absolute",
          left: 78,
          top: 148,
          width: 664,
          height: 402,
          gap: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontWeight: 500,
            fontSize: layout.titleSize,
            letterSpacing:
              locale === "ja" || locale === "zh-CN" ? "-0.015em" : "-0.04em",
            lineHeight: layout.titleLineHeight,
          }}
        >
          {layout.titleLines.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static raster text lines have no mutable list state.
            <span key={index} style={{ whiteSpace: "pre" }}>
              {line}
            </span>
          ))}
        </div>
        {layout.descriptionLines.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "RedHatDisplay, NotoSansCJK",
              fontSize: 24,
              lineHeight: 1.34,
              color: "#b7c3d4",
            }}
          >
            {layout.descriptionLines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static raster text lines have no mutable list state.
              <span key={index} style={{ whiteSpace: "pre" }}>
                {line}
              </span>
            ))}
          </div>
        )}
      </div>
      {[48, 1152].map((left) => (
        <div
          key={left}
          style={{
            display: "flex",
            position: "absolute",
            left,
            top: 0,
            width: 1,
            height: 630,
            background: "#344152",
          }}
        />
      ))}
      {[112, 581].map((top) => (
        <div
          key={top}
          style={{
            display: "flex",
            position: "absolute",
            top,
            left: 0,
            height: 1,
            width: 1200,
            background: "#344152",
          }}
        />
      ))}
      {[48, 1152].flatMap((left) =>
        [112, 581].map((top) => (
          <div
            key={`${left}-${top}`}
            style={{
              display: "flex",
              position: "absolute",
              left: left - 7,
              top: top - 7,
              width: 15,
              height: 15,
            }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 0,
                top: 7,
                width: 15,
                height: 1,
                background: "#9eb5d4",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 7,
                top: 0,
                width: 1,
                height: 15,
                background: "#9eb5d4",
              }}
            />
          </div>
        )),
      )}
    </div>,
    {
      ...ogImageSize,
      fonts: [
        ...cjkOgFont(`${title} ${description}`, locale),
        { name: "LTSuperior", data: headingFont, weight: 500, style: "normal" },
        { name: "RedHatDisplay", data: bodyFont, weight: 400, style: "normal" },
      ],
    },
  );
};

export namespace createOgImage {
  export type Params = {
    title: string;
    description: string;
    signoff?: string;
    locale?: Locale;
  };
}
