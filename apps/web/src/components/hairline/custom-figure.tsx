"use client";

import { cn } from "@zenncore/utils";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { useDocument } from "@/hooks/use-document";
import agentTestGaugeRest from "./rest/agent-test-gauge.json";
import analyticsRecorderRest from "./rest/analytics-recorder.json";
import brandMegaphoneRest from "./rest/brand-megaphone.json";
import browserToolbenchRest from "./rest/browser-toolbench.json";
import channelPlugHubRest from "./rest/channel-plug-hub.json";
import checkoutLanesRest from "./rest/checkout-lanes.json";
import checkoutTillRest from "./rest/checkout-till.json";
import checkoutWorkbenchRest from "./rest/checkout-workbench.json";
import comparisonStandRest from "./rest/comparison-stand.json";
import demoPlaneRest from "./rest/demo-plane.json";
import documentStackRest from "./rest/document-stack.json";
import feedBeaconRest from "./rest/feed-beacon.json";
import headphonesRest from "./rest/headphones.json";
import importChuteRest from "./rest/import-chute.json";
import inspectionQueueRest from "./rest/inspection-queue.json";
import lipstickRest from "./rest/lipstick.json";
import merchantFolioRest from "./rest/merchant-folio.json";
import moneyStackRest from "./rest/money-stack.json";
import officeChairRest from "./rest/office-chair.json";
import openBookRest from "./rest/open-book.json";
import overviewConsoleRest from "./rest/overview-console.json";
import packagedFoodRest from "./rest/packaged-food.json";
import productLabelRest from "./rest/product-label.json";
import questionCardsRest from "./rest/question-cards.json";
import readinessScannerRest from "./rest/readiness-scanner.json";
import repairToolsRest from "./rest/repair-tools.json";
import reportPrinterRest from "./rest/report-printer.json";
import researchTelescopeRest from "./rest/research-telescope.json";
import rivalsBalanceRest from "./rest/rivals-balance.json";
import settingsGearsRest from "./rest/settings-gears.json";
import shelfLadderRest from "./rest/shelf-ladder.json";
import shopifyBagRest from "./rest/shopify-bag.json";
import shoppingBotRest from "./rest/shopping-bot.json";
import sneakerRest from "./rest/sneaker.json";
import sofaRest from "./rest/sofa.json";
import storefrontRest from "./rest/storefront.json";
import suitcaseRest from "./rest/suitcase.json";
import targetFinderRest from "./rest/target-finder.json";
import wellnessBottleRest from "./rest/wellness-bottle.json";
import wineBottleRest from "./rest/wine-bottle.json";
import wooMarkRest from "./rest/woo-mark.json";
import "./kernel-style.css";

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
const restPoses = {
  "research-telescope": researchTelescopeRest,
  "question-cards": questionCardsRest,
  "brand-megaphone": brandMegaphoneRest,
  "rivals-balance": rivalsBalanceRest,
  "target-finder": targetFinderRest,
  "shelf-ladder": shelfLadderRest,
  "analytics-recorder": analyticsRecorderRest,
  "report-printer": reportPrinterRest,
  "settings-gears": settingsGearsRest,
  "channel-plug-hub": channelPlugHubRest,
  "overview-console": overviewConsoleRest,
  storefront: storefrontRest,
  "import-chute": importChuteRest,
  "product-label": productLabelRest,
  "feed-beacon": feedBeaconRest,
  "agent-test-gauge": agentTestGaugeRest,
  "checkout-till": checkoutTillRest,
  "checkout-workbench": checkoutWorkbenchRest,
  "checkout-lanes": checkoutLanesRest,
  "browser-toolbench": browserToolbenchRest,
  "comparison-stand": comparisonStandRest,
  "demo-plane": demoPlaneRest,
  "shopify-bag": shopifyBagRest,
  "woo-mark": wooMarkRest,
  "merchant-folio": merchantFolioRest,
  "shopping-bot": shoppingBotRest,
  "repair-tools": repairToolsRest,
  "money-stack": moneyStackRest,
  "readiness-scanner": readinessScannerRest,
  "inspection-queue": inspectionQueueRest,
  "office-chair": officeChairRest,
  "document-stack": documentStackRest,
  "open-book": openBookRest,
  sofa: sofaRest,
  headphones: headphonesRest,
  lipstick: lipstickRest,
  "wellness-bottle": wellnessBottleRest,
  "packaged-food": packagedFoodRest,
  "wine-bottle": wineBottleRest,
  sneaker: sneakerRest,
  suitcase: suitcaseRest,
};

/** Validated rest geometry is present in HTML; the fixed kernel enhances it in view. */
export const CustomHairlineFigure = ({
  name,
  label,
  surface = "background",
  className,
}: CustomHairlineFigure.Props) => {
  const stage = useRef<HTMLDivElement>(null);
  const drawing = useRef<SVGSVGElement>(null);
  const [near, setNear] = useState(false);
  const [kernelReady, setKernelReady] = useState(false);
  const [registryReady, setRegistryReady] = useState(false);
  const [figureReady, setFigureReady] = useState(false);
  const { ready, reduced } = useInteractive();
  const { window } = useDocument();
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
    if (!kernelReady || !window) return;
    const browser = window as FigureWindow;
    const registry = browser.customHairline ?? {};
    browser.customHairline = registry;
    browser.hairline = (definition) => {
      registry[definition.name] = definition;
    };
    setRegistryReady(true);
  }, [kernelReady, window]);

  useEffect(() => {
    const element = stage.current;
    const svg = drawing.current;
    const definition = (window as FigureWindow | null)?.customHairline?.[name];
    if (!element || !svg || !definition || !figureReady || !ready || reduced)
      return;
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
  }, [name, figureReady, ready, reduced, rest, window]);

  return (
    <>
      {near && ready && !reduced && (
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

export namespace CustomHairlineFigure {
  export type Props = {
    name: FigureName;
    label: string;
    surface?: "background" | "field" | "rich" | "dark";
    className?: string;
  };
}
