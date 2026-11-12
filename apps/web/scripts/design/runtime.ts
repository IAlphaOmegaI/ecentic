export type Owner = {
  id: string;
  selector: string;
  source: string;
  routes?: string[];
  required?: boolean;
};

export type Embedded = Owner & {
  column: string;
  wrapper: string;
  stretchFrom?: number;
  notApplicable?: string;
};

export type Registry = {
  schemaVersion: number;
  defaults: { routes: string[]; locale: string[]; width: number[] };
  additionalRoutes: string[];
  structural: Owner[];
  embedded: Embedded[];
  artwork: Owner[];
  figureNames: string[];
  exclusions: string;
  manual: { id: string; reason: string; source: string }[];
  sourceAdvisories: string[];
};

export type Edge = {
  owner: string;
  source: string;
  registration: string;
  side: "top" | "bottom";
  x: number;
  width: number;
  strokeCenterY: number;
  visible: boolean;
  structural: boolean;
};

export const duplicatedStructuralStroke = (first: Edge, second: Edge) => {
  const overlap = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) -
      Math.max(first.x, second.x),
  );
  return (
    first.owner !== second.owner &&
    first.visible &&
    second.visible &&
    first.structural &&
    second.structural &&
    Math.abs(first.strokeCenterY - second.strokeCenterY) <= 1.1 &&
    overlap >= Math.min(first.width, second.width) * 0.85
  );
};

export const findDuplicateEdges = (edges: Edge[]) =>
  edges.flatMap((first, index) =>
    edges
      .slice(index + 1)
      .filter((second) => duplicatedStructuralStroke(first, second))
      .map((second) => ({ first, second })),
  );

export type Surface = {
  id: string;
  selector: string;
  source: string;
  left: number;
  right: number;
  bottom: number;
  contentLeft: number;
  contentRight: number;
  contentBottom: number;
  paddingLeft: number;
  paddingRight: number;
  radius: number;
  secondShell: boolean;
  stretch: boolean;
  clipped: string[];
};

export const inspectSurface = (surface: Surface) => ({
  fillsColumn:
    Math.abs(surface.left - surface.contentLeft) <= 1 &&
    Math.abs(surface.right - surface.contentRight) <= 1,
  decorativeInset: surface.paddingLeft > 0 || surface.paddingRight > 0,
  secondShell: surface.secondShell,
  roundedOuterShell: surface.radius > 0,
  fillsStretch:
    !surface.stretch || Math.abs(surface.bottom - surface.contentBottom) <= 1,
  terminalReachable: surface.clipped.length === 0,
});

export const terminalClipped = ({
  bottom,
  clipBottom,
  overflow,
  scrollableBetween,
}: {
  bottom: number;
  clipBottom: number;
  overflow: string;
  scrollableBetween: boolean;
}) =>
  (overflow === "hidden" || overflow === "clip") &&
  bottom > clipBottom + 1 &&
  !scrollableBetween;

export const productionCaption = (
  text: string,
  names: string[],
  options: {
    visible: boolean;
    screenReaderOnly: boolean;
    meaningfulStatus: boolean;
  },
) => {
  if (!options.visible || options.screenReaderOnly || options.meaningfulStatus)
    return false;
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  return (
    ["at rest", "rest", ...names.map((name) => name.toLowerCase())].includes(
      normalized,
    ) ||
    /^(?:fps|intensity|vertices|edges|faces|rotation|frame|render time)\s*[:=]\s*[\d.]+(?:\s*(?:ms|fps|°|%))?$/i.test(
      normalized,
    )
  );
};

export { roadmapSourceAdvisories } from "./source";

export const applies = (owner: Owner, route: string) =>
  !owner.routes || owner.routes.includes(route);

export const localizedPath = (route: string, locale: string) =>
  locale === "en" ? route : `/es${route === "/" ? "" : route}`;

/** next-intl's as-needed routing checks NEXT_LOCALE before Accept-Language. */
export const openLocalizedRoute = async (
  { route, locale, base }: { route: string; locale: string; base: string },
  command: (arguments_: string[]) => Promise<unknown>,
) => {
  // URL's root path replaces the prior preference for this origin only.
  await command([
    "cookies",
    "set",
    "NEXT_LOCALE",
    locale,
    "--url",
    new URL("/", base).href,
    "--same-site",
    "Lax",
  ]);
  await command(["open", new URL(localizedPath(route, locale), base).href]);
};

/** Serialized into the browser. Keep this collector self-contained and read-only. */
export const collectRuntime = (configuration: {
  structural: Owner[];
  embedded: Embedded[];
  artwork: Owner[];
  exclusions: string;
}) => {
  const root = document.querySelector("main") ?? document.body;
  const errors: { id: string; source: string; message: string }[] = [];
  const path = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    if (element === document.documentElement) return "html";
    if (!element.parentElement) return element.tagName.toLowerCase();
    return `${path(element.parentElement)} > ${element.tagName.toLowerCase()}:nth-child(${Array.from(element.parentElement.children).indexOf(element) + 1})`;
  };
  const ancestors = (element: Element): Element[] => [
    element,
    ...(element.parentElement ? ancestors(element.parentElement) : []),
  ];
  const visible = (element: Element) => {
    const rectangle = element.getBoundingClientRect();
    return (
      rectangle.width > 0 &&
      rectangle.height > 0 &&
      ancestors(element).every((ancestor) => {
        const style = getComputedStyle(ancestor);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.visibility !== "collapse" &&
          Number(style.opacity) !== 0 &&
          !ancestor.hasAttribute("hidden")
        );
      })
    );
  };
  const transparent = (color: string) =>
    color === "transparent" ||
    /^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$|\/\s*0(?:\.0+)?(?:%)?\s*\)$/.test(color);
  const border = (
    element: Element,
    side: "Top" | "Bottom" | "Left" | "Right",
  ) => {
    const style = getComputedStyle(element);
    const thickness = Number.parseFloat(style[`border${side}Width`]);
    return thickness > 0 &&
      !["none", "hidden"].includes(style[`border${side}Style`]) &&
      !transparent(style[`border${side}Color`])
      ? thickness
      : 0;
  };
  const bordered = (element: Element) =>
    (["Top", "Bottom", "Left", "Right"] as const).some(
      (side) => border(element, side) > 0,
    );
  const registered = configuration.structural.flatMap((owner) => {
    const elements = Array.from(root.querySelectorAll(owner.selector));
    if (owner.required && elements.length === 0)
      errors.push({
        id: owner.id,
        source: owner.source,
        message: `Required structural selector is missing: ${owner.selector}`,
      });
    return elements.map((element) => ({ owner, element }));
  });
  // A DOM owner is measured once even if several structural contracts select it.
  const unique = registered.filter(
    (entry, index) =>
      registered.findIndex(
        (candidate) => candidate.element === entry.element,
      ) === index,
  );
  const edges: Edge[] = unique.flatMap(({ owner, element }) => {
    const rectangle = element.getBoundingClientRect();
    if (
      !visible(element) ||
      element.closest(configuration.exclusions) ||
      getComputedStyle(element).position === "fixed"
    )
      return [];
    return (["Top", "Bottom"] as const).flatMap((side) => {
      const thickness = border(element, side);
      if (thickness < 0.5 || rectangle.width < 160) return [];
      return [
        {
          owner: path(element),
          source: owner.source,
          registration: owner.id,
          side: side === "Top" ? ("top" as const) : ("bottom" as const),
          x: rectangle.left,
          width: rectangle.width,
          strokeCenterY:
            (side === "Top"
              ? rectangle.top + thickness / 2
              : rectangle.bottom - thickness / 2) + scrollY,
          visible: true,
          structural: true,
        },
      ];
    });
  });
  for (const owner of configuration.embedded) {
    if (owner.notApplicable && root.querySelector(owner.selector))
      errors.push({
        id: owner.id,
        source: owner.source,
        message: `Previously non-applicable surface now exists (${owner.selector}); register its column contract before claiming coverage.`,
      });
  }
  const surfaces = configuration.embedded
    .filter((owner) => !owner.notApplicable)
    .flatMap((owner) => {
      const surface = root.querySelector(owner.selector);
      const column = root.querySelector(owner.column);
      const wrapper = root.querySelector(owner.wrapper);
      if (!surface || !column || !wrapper) {
        errors.push({
          id: owner.id,
          source: owner.source,
          message: `Required embedded selector is missing: surface=${owner.selector}; column=${owner.column}; wrapper=${owner.wrapper}`,
        });
        return [];
      }
      if (!visible(surface) || !visible(column)) {
        errors.push({
          id: owner.id,
          source: owner.source,
          message:
            "Registered embedded surface or column is hidden; geometry was not checked.",
        });
        return [];
      }
      const rectangle = surface.getBoundingClientRect();
      const container = column.getBoundingClientRect();
      const style = getComputedStyle(wrapper);
      const surfaceStyle = getComputedStyle(surface);
      const sameOwner = surface === column;
      const text = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      const next = () => {
        const node = text.nextNode();
        if (!node) return;
        if (
          node.textContent?.trim() &&
          node.parentElement &&
          visible(node.parentElement) &&
          !node.parentElement.closest(".sr-only,script,style,title")
        )
          nodes.push(node as Text);
        next();
      };
      next();
      const clipped = nodes.flatMap((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const bottom = range.getBoundingClientRect().bottom;
        const chain = node.parentElement ? ancestors(node.parentElement) : [];
        return chain.flatMap((ancestor, index) => {
          const overflow = getComputedStyle(ancestor).overflowY;
          const clipBottom =
            ancestor.getBoundingClientRect().bottom -
            border(ancestor, "Bottom");
          const scrollableBetween = chain
            .slice(0, index)
            .some(
              (inner) =>
                /^(auto|scroll)$/.test(getComputedStyle(inner).overflowY) &&
                inner.scrollHeight > inner.clientHeight + 1,
            );
          return (overflow === "hidden" || overflow === "clip") &&
            bottom > clipBottom + 1 &&
            !scrollableBetween
            ? [path(ancestor)]
            : [];
        });
      });
      return [
        {
          id: owner.id,
          selector: owner.selector,
          source: owner.source,
          left: rectangle.left + (sameOwner ? border(surface, "Left") : 0),
          right: rectangle.right - (sameOwner ? border(surface, "Right") : 0),
          bottom:
            rectangle.bottom - (sameOwner ? border(surface, "Bottom") : 0),
          contentLeft: container.left + border(column, "Left"),
          contentRight: container.right - border(column, "Right"),
          contentBottom: container.bottom - border(column, "Bottom"),
          paddingLeft: Number.parseFloat(style.paddingLeft),
          paddingRight: Number.parseFloat(style.paddingRight),
          radius: Math.max(
            Number.parseFloat(surfaceStyle.borderTopLeftRadius),
            Number.parseFloat(surfaceStyle.borderTopRightRadius),
          ),
          secondShell:
            wrapper !== surface && bordered(wrapper) && bordered(surface),
          stretch:
            owner.stretchFrom !== undefined && innerWidth >= owner.stretchFrom,
          clipped: [...new Set(clipped)],
        },
      ];
    });
  const artwork = configuration.artwork.flatMap((owner) =>
    Array.from(root.querySelectorAll(owner.selector)).map((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const nodes: {
        text: string;
        selector: string;
        visible: boolean;
        screenReaderOnly: boolean;
        meaningfulStatus: boolean;
      }[] = [];
      const next = () => {
        const node = walker.nextNode();
        if (!node) return;
        const parent = node.parentElement;
        if (
          parent &&
          node.textContent?.trim() &&
          !parent.closest("script,style,title,desc")
        ) {
          const style = getComputedStyle(parent);
          const range = document.createRange();
          range.selectNodeContents(node);
          const rectangle = range.getBoundingClientRect();
          const screenReaderOnly =
            Boolean(parent.closest(".sr-only,[data-sr-only]")) ||
            (style.position === "absolute" &&
              (style.clip !== "auto" || style.clipPath !== "none") &&
              parent.getBoundingClientRect().width <= 1);
          nodes.push({
            text: node.textContent.trim(),
            selector: path(parent),
            visible:
              visible(parent) && rectangle.width > 0 && rectangle.height > 0,
            screenReaderOnly,
            meaningfulStatus: Boolean(
              parent.closest("[data-design-meaningful-status]"),
            ),
          });
        }
        next();
      };
      next();
      return {
        id: owner.id,
        source: owner.source,
        selector: path(element),
        visible: visible(element),
        rendered: Boolean(element.querySelector("svg,img,canvas")),
        nodes,
      };
    }),
  );
  return {
    url: location.pathname,
    locale: document.documentElement.lang,
    width: innerWidth,
    overflow: document.documentElement.scrollWidth - innerWidth,
    ownerCount: unique.length,
    edges,
    surfaces,
    artwork,
    errors,
  };
};

/** Expose lazy art using ordinary scrolling; absence remains an explicit unchecked case. */
export const exposeArtwork = async (selectors: string[]) => {
  const frames = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  const elements = Array.from(document.querySelectorAll(selectors.join(",")));
  for (const element of elements) {
    if (element.getBoundingClientRect().height === 0) continue;
    element.scrollIntoView({ block: "center", behavior: "instant" });
    await frames();
    const deadline = performance.now() + 1500;
    const rendered = async (): Promise<void> => {
      if (
        element.querySelector("svg,img,canvas") ||
        performance.now() >= deadline
      )
        return;
      await frames();
      return rendered();
    };
    await rendered();
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  await frames();
  return elements.length;
};

export const prepareWheel = (selector: string) => {
  const surface = document.querySelector(selector);
  if (!surface) return null;
  const local = [surface, ...Array.from(surface.querySelectorAll("*"))].find(
    (element) =>
      /^(auto|scroll)$/.test(getComputedStyle(element).overflowY) &&
      element.scrollHeight > element.clientHeight + 1,
  );
  const target = local ?? document.documentElement;
  const pointer = local ?? surface;
  pointer.scrollIntoView({ block: "center", behavior: "instant" });
  const rectangle = pointer.getBoundingClientRect();
  const path = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    if (element === document.documentElement) return "html";
    if (!element.parentElement) return element.tagName.toLowerCase();
    return `${path(element.parentElement)} > ${element.tagName.toLowerCase()}:nth-child(${Array.from(element.parentElement.children).indexOf(element) + 1})`;
  };
  const maximum = target.scrollHeight - target.clientHeight;
  const before = local ? target.scrollTop : scrollY;
  return {
    selector: local ? path(target) : "html",
    local: Boolean(local),
    before,
    maximum,
    delta: maximum - before > 20 ? 480 : -480,
    x: Math.max(
      1,
      Math.min(innerWidth - 1, rectangle.left + rectangle.width / 2),
    ),
    y: Math.max(
      1,
      Math.min(
        innerHeight - 1,
        (Math.max(0, rectangle.top) + Math.min(innerHeight, rectangle.bottom)) /
          2,
      ),
    ),
  };
};
