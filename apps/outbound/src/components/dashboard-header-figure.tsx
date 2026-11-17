"use client";

import { cn } from "@zenncore/utils";
import { useMediaQuery } from "@zenncore/web/hooks";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import brandMegaphoneRest from "./hairline/rest/brand-megaphone.json";
import channelPlugHubRest from "./hairline/rest/channel-plug-hub.json";
import documentStackRest from "./hairline/rest/document-stack.json";
import importChuteRest from "./hairline/rest/import-chute.json";
import inspectionQueueRest from "./hairline/rest/inspection-queue.json";
import openBookRest from "./hairline/rest/open-book.json";
import overviewConsoleRest from "./hairline/rest/overview-console.json";
import productLabelRest from "./hairline/rest/product-label.json";
import questionCardsRest from "./hairline/rest/question-cards.json";
import readinessScannerRest from "./hairline/rest/readiness-scanner.json";
import researchTelescopeRest from "./hairline/rest/research-telescope.json";
import targetFinderRest from "./hairline/rest/target-finder.json";
import "./hairline/kernel-style.css";

type FigureName = keyof typeof restPoses;
type FigureDefinition = {
  name: FigureName;
  range: [number, number, number];
  mount: (
    host: {
      stage: HTMLElement;
      svg: SVGSVGElement;
      read: { textContent: string };
    },
    intensity: number,
  ) => { set: (intensity: number) => void; destroy: () => void };
};
type FigureWindow = Window & {
  hairline?: (definition: FigureDefinition) => void;
  customHairline?: Partial<Record<FigureName, FigureDefinition>>;
};
// The same approved geometry and unchanged kernel used by ecentic's dashboard.
const restPoses = {
  "document-stack": documentStackRest,
  "import-chute": importChuteRest,
  "inspection-queue": inspectionQueueRest,
  "open-book": openBookRest,
  "overview-console": overviewConsoleRest,
  "product-label": productLabelRest,
  "channel-plug-hub": channelPlugHubRest,

  "brand-megaphone": brandMegaphoneRest,
  "question-cards": questionCardsRest,
  "readiness-scanner": readinessScannerRest,
  "research-telescope": researchTelescopeRest,
  "target-finder": targetFinderRest,
};
const subjects = {
  overview: "overview-console",
  prospects: "document-stack",
  prospectNew: "import-chute",
  prospectDetail: "product-label",
  replies: "question-cards",
  playbook: "open-book",
  integrations: "channel-plug-hub",
  review: "inspection-queue",
  reviewDetail: "product-label",
  linkedin: "question-cards",

  campaigns: "target-finder",
  campaignNew: "question-cards",
  campaignDetail: "brand-megaphone",
  contacts: "research-telescope",
  warmup: "readiness-scanner",
} as const satisfies Record<string, FigureName>;

export const DashboardHeaderFigure = ({
  subject,
  surface = "background",
}: {
  subject: keyof typeof subjects;
  surface?: CustomFigureProps["surface"];
}) => (
  <div
    aria-hidden
    className="flex size-16 shrink-0 items-center justify-center sm:size-20"
  >
    <CustomHairlineFigure
      name={subjects[subject]}
      label=""
      surface={surface}
      className="bg-transparent"
    />
  </div>
);

/** Validated rest geometry is present in HTML; the fixed kernel enhances it in view. */
const CustomHairlineFigure = ({
  name,
  label,
  surface = "background",
  className,
}: CustomFigureProps) => {
  const stage = useRef<HTMLDivElement>(null);
  const drawing = useRef<SVGSVGElement>(null);
  const [near, setNear] = useState(false);
  const [kernelReady, setKernelReady] = useState(false);
  const [registryReady, setRegistryReady] = useState(false);
  const [figureReady, setFigureReady] = useState(false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {
    defaultMatches: true,
  });
  const rest = restPoses[name];

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!kernelReady) return;
    const browser = window as FigureWindow;
    const registry = browser.customHairline ?? {};
    browser.customHairline = registry;
    browser.hairline = (definition) => {
      registry[definition.name] = definition;
    };
    setRegistryReady(true);
  }, [kernelReady]);

  useEffect(() => {
    const element = stage.current;
    const svg = drawing.current;
    const definition = (window as FigureWindow).customHairline?.[name];
    if (!element || !svg || !definition || !figureReady || reduced) return;
    const read = { textContent: "rest" };
    svg.replaceChildren();
    const handle = (() => {
      try {
        return definition.mount(
          { stage: element, svg, read },
          definition.range[1],
        );
      } catch {
        svg.innerHTML = rest;
        return null;
      }
    })();
    if (!handle) return;
    element.setAttribute("data-custom-motion", "responsive");
    return () => {
      handle.destroy();
      // Only local, validator-checked SVG geometry is restored here.
      svg.innerHTML = rest;
      element.setAttribute("data-custom-motion", "rest");
    };
  }, [name, figureReady, reduced, rest]);

  return (
    <>
      {near && !reduced && (
        <Script
          src="/hairline/kernel.js"
          strategy="afterInteractive"
          onReady={() => setKernelReady(true)}
        />
      )}
      {registryReady && near && !reduced && (
        <Script
          src={`/hairline/custom/${name}.js`}
          type="module"
          strategy="afterInteractive"
          onReady={() => setFigureReady(true)}
        />
      )}
      <div
        ref={stage}
        role="img"
        aria-label={label}
        data-hairline={name}
        data-hairline-figure=""
        data-hairline-surface={surface}
        data-custom-motion="rest"
        data-hairline-theme={surface === "dark" ? "dark" : "light"}
        className={cn(
          "relative isolate aspect-[5/4] w-full min-w-0 overflow-hidden [--hairline-edge:var(--color-cross)] [--hairline-hi:var(--color-primary-text)] [--hairline-lo:var(--color-accent-foreground)] [--hairline-mid:var(--color-foreground-dimmed)] [--hairline-stroke:1]",
          surface === "background" &&
            "bg-background [--hairline-plate:var(--color-background)]",
          surface === "field" &&
            "bg-background-dimmed [--hairline-plate:var(--color-background-dimmed)]",
          surface === "rich" &&
            "bg-background-rich [--hairline-plate:var(--color-background-rich)]",
          surface === "dark" &&
            "bg-emphasis-dimmed [--hairline-edge:var(--color-background-rich)] [--hairline-hi:var(--color-primary-rich)] [--hairline-lo:var(--color-foreground-dimmed)] [--hairline-mid:var(--color-background-dimmed)] [--hairline-plate:var(--color-emphasis-dimmed)]",
          reduced && "pointer-events-none",
          className,
        )}
      >
        <svg
          ref={drawing}
          aria-hidden
          viewBox="0 0 400 320"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Local geometry exported from the validated, fixed Hairline bench.
          dangerouslySetInnerHTML={{ __html: rest }}
        />
      </div>
    </>
  );
};

type CustomFigureProps = {
  name: FigureName;
  label: string;
  surface?: "background" | "field" | "rich" | "dark";
  className?: string;
};
