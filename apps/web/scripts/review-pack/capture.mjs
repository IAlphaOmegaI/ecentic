import * as Files from "node:fs/promises";
import * as Path from "node:path";
import { resultify } from "@zenncore/utils";

export const dismiss = async (page) => {
  const decision = await page.evaluate(() =>
    localStorage.getItem("ecentic-cookie-consent"),
  );
  if (decision === "denied") return;
  const banner = page.locator("aside[data-cookie-consent]");
  const available = await resultify(() =>
    banner.waitFor({ state: "visible", timeout: 15000 }),
  );
  if (!available.success) return;
  await banner.locator('[data-consent-action="reject"]').click();
  await banner.waitFor({ state: "hidden" });
};

export const prepare = async (page) => {
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 15000)),
    ]),
  );
  await dismiss(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content:
      "html,body{scrollbar-width:none!important;scroll-behavior:auto!important}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}",
  });
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    const positions = Array.from(
      { length: Math.ceil(height / innerHeight) + 1 },
      (_, index) => index * innerHeight,
    );
    for (const position of positions) {
      scrollTo({ top: position, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    for (const image of document.images) image.loading = "eager";
    await Promise.race([
      Promise.all(
        Array.from(document.images).map((image) =>
          image.decode().catch(() => null),
        ),
      ),
      new Promise((resolve) => setTimeout(resolve, 15000)),
    ]);
    // Large indexes can queue over a hundred remote images in each browser.
    // Wait for actual completion after decode's bounded attempt, but preserve
    // exhausted requests as pending evidence instead of calling them missing.
    const imageDeadline = performance.now() + 45000;
    while (
      Array.from(document.images).some((image) => !image.complete) &&
      performance.now() < imageDeadline
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 15000)),
    ]);
    scrollTo({ top: 0, behavior: "instant" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  await page.evaluate(async () => {
    for (const video of document.querySelectorAll("video")) {
      const started = performance.now();
      while (
        video.currentSrc &&
        video.readyState < 2 &&
        !video.error &&
        performance.now() - started < 5000
      )
        await new Promise((resolve) => setTimeout(resolve, 100));
      const evidence = {
        source: video.currentSrc || video.getAttribute("src"),
        poster: video.poster || null,
        readyState: video.readyState,
        error: video.error
          ? { code: video.error.code, message: video.error.message }
          : null,
        frame: "paused video",
        posterError: null,
      };
      video.autoplay = false;
      video.pause();
      if (video.poster) {
        const poster = new Image();
        poster.src = video.poster;
        try {
          await Promise.race([
            poster.decode(),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      "Existing poster did not decode within 10 seconds",
                    ),
                  ),
                10000,
              ),
            ),
          ]);
          // Use the page's existing poster only in this capture context. Keep
          // the original load/error evidence so a poster never conceals failure.
          video.removeAttribute("src");
          for (const source of video.querySelectorAll("source"))
            source.removeAttribute("src");
          video.load();
          evidence.frame = "existing poster";
        } catch (error) {
          evidence.posterError = String(error);
        }
      }
      video.dataset.reviewMedia = JSON.stringify(evidence);
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  await dismiss(page);
  return settle(page);
};

// SSR controls may finish measuring their overflow just after fonts/images.
// Observe that state without adding focusability or changing the page.
export const settle = (page) =>
  page.evaluate(async () => {
    const started = performance.now();
    const state = { previous: "", stableSince: started, samples: 0 };
    const inspect = () => {
      const scrollAreas = Array.from(
        document.querySelectorAll('[role="presentation"][tabindex]'),
      )
        .filter((element) => getComputedStyle(element).overflow === "scroll")
        .map((element) => ({
          id: element.getAttribute("data-id"),
          width: element.clientWidth,
          height: element.clientHeight,
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
          tabIndex: element.tabIndex,
          needsFocus:
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1,
        }));
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        fonts: document.fonts.status,
        scrollAreas,
      };
    };
    for (const sample of Array.from({ length: 51 }, (_, index) => index)) {
      const current = inspect();
      const signature = JSON.stringify(current);
      const now = performance.now();
      state.samples += 1;
      if (signature !== state.previous) state.stableSince = now;
      state.previous = signature;
      const ready =
        now - state.stableSince >= 500 &&
        current.fonts === "loaded" &&
        current.scrollAreas.every(
          (area) => !area.needsFocus || area.tabIndex >= 0,
        );
      if (ready || sample === 50)
        return {
          ready,
          elapsedMs: Math.round(now - started),
          samples: state.samples,
          ...current,
        };
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

export const inspect = (page) =>
  page.evaluate(() => {
    const content = document.querySelector("main") ?? document.body;
    const visible = content.innerText;
    const pending = Array.from(document.querySelectorAll("[data-review-todo]"))
      .map((element) => element.dataset.reviewTodo)
      .filter(Boolean);
    const placeholders = Array.from(
      new Set([
        ...(document.body.innerText.match(/\{\{TODO\b[\s\S]*?\}\}/g) ?? []),
        ...pending,
      ]),
    );
    const selection = [
      ["page", document.querySelector(".marketing-site") ?? document.body],
      ["heading", content.querySelector("h1")],
      ["body", content.querySelector("p")],
      ["primary", content.querySelector(".marketing-actions a,button")],
      ["rail", content.querySelector(".marketing-rail")],
      ["navigation", document.querySelector("header")],
    ];
    const properties = [
      "--color-background",
      "--color-background-rich",
      "--color-background-dimmed",
      "--color-foreground",
      "--color-foreground-dimmed",
      "--color-accent-foreground",
      "--color-primary",
      "--canvas",
      "--field",
      "--ink",
      "--body",
      "--blue",
      "--blue-text",
      "--line",
      "--cross",
    ];
    return {
      url: location.href,
      title: document.title,
      description:
        document.querySelector('meta[name="description"]')?.content ?? "",
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
      language: document.documentElement.lang,
      headings: Array.from(content.querySelectorAll("h1")).map((heading) =>
        heading.textContent.trim(),
      ),
      words: [
        ...new Intl.Segmenter(document.documentElement.lang || "en", {
          granularity: "word",
        }).segment(visible),
      ].filter((segment) => segment.isWordLike).length,
      placeholders,
      media: Array.from(
        document.querySelectorAll("video[data-review-media]"),
      ).map((video) => JSON.parse(video.dataset.reviewMedia)),
      width: innerWidth,
      height: document.documentElement.scrollHeight,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      fonts: {
        status: document.fonts.status,
        loaded: Array.from(document.fonts).map((font) => ({
          family: font.family,
          weight: font.weight,
          status: font.status,
        })),
      },
      consent: {
        decision: localStorage.getItem("ecentic-cookie-consent"),
        banner: Boolean(document.querySelector("aside[data-cookie-consent]")),
      },
      images: {
        count: document.images.length,
        broken: Array.from(document.images)
          .filter((image) => !image.complete || !image.naturalWidth)
          .map((image) => ({
            source: image.currentSrc || image.src,
            alt: image.alt,
            state: image.complete ? "failed" : "pending",
          })),
      },
      styles: Object.fromEntries(
        selection
          .filter(([, element]) => element)
          .map(([name, element]) => {
            const style = getComputedStyle(element);
            return [
              name,
              {
                font: style.fontFamily,
                fontAvailable: document.fonts.check(
                  `${style.fontWeight} ${style.fontSize} ${style.fontFamily.split(",")[0]}`,
                ),
                weight: style.fontWeight,
                size: style.fontSize,
                color: style.color,
                background: style.backgroundColor,
                image: style.backgroundImage,
                bounds: element.getBoundingClientRect().toJSON(),
                radius: style.borderRadius,
                border: style.border,
                padding: style.padding,
                lineHeight: style.lineHeight,
                width: style.width,
                maxWidth: style.maxWidth,
                tokens: Object.fromEntries(
                  properties.map((property) => [
                    property,
                    style.getPropertyValue(property).trim(),
                  ]),
                ),
              },
            ];
          }),
      ),
    };
  });

export const audit = async (page, source) => {
  if (!source) return { available: false, reason: "axe-core was not resolved" };
  await page.addScriptTag({ path: source });
  const findings = await resultify(() =>
    page.evaluate(async () => {
      const results = await window.axe.run(document, {
        resultTypes: ["violations", "incomplete"],
      });
      return {
        available: true,
        version: results.testEngine.version,
        violations: results.violations,
        incomplete: results.incomplete,
      };
    }),
  );
  if (!findings.success)
    return { available: false, reason: findings.error.message };
  return findings.data;
};

const restoreCaptureLayout = (page) =>
  page.evaluate(() => {
    for (const element of document.querySelectorAll("[data-review-overlay]")) {
      element.style.visibility = element.dataset.reviewOverlay;
      delete element.dataset.reviewOverlay;
    }
    for (const element of document.querySelectorAll("[data-review-sticky]")) {
      element.style.position = element.dataset.reviewSticky;
      delete element.dataset.reviewSticky;
    }
    scrollTo({ top: 0, behavior: "instant" });
  });

export const screenshot = async (page, sharp, destination) => {
  const viewport = page.viewportSize();
  await page.evaluate(async () => {
    for (const element of document.querySelectorAll("body *")) {
      if (
        getComputedStyle(element).position !== "sticky" ||
        element.tagName === "HEADER"
      )
        continue;
      element.dataset.reviewSticky = element.style.position;
      element.style.position = "static";
    }
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  const geometry = await page.evaluate(() => ({
    width: Math.max(
      innerWidth,
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
    height: Math.max(
      innerHeight,
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    ),
    scale: devicePixelRatio,
  }));
  const width = Math.round(geometry.width * geometry.scale);
  const height = Math.round(geometry.height * geometry.scale);
  const directory = `${destination}.tiles`;
  try {
    if (height <= 15000) {
      await page.screenshot({
        path: destination,
        fullPage: true,
        animations: "disabled",
      });
      const saved = await sharp(destination, {
        limitInputPixels: width * height,
      }).metadata();
      if (saved.width !== width || saved.height !== height)
        throw new Error(
          `Screenshot size changed during capture: expected ${width}×${height}, saved ${saved.width}×${saved.height}`,
        );
      return {
        method: "full-page",
        width,
        height,
        tiles: 1,
        cssWidth: geometry.width,
        cssHeight: geometry.height,
      };
    }
    await Files.mkdir(directory, { recursive: true });
    const positions = Array.from(
      { length: Math.ceil(geometry.height / viewport.height) },
      (_, index) => index * viewport.height,
    );
    const composites = [];
    for (const [index, position] of positions.entries()) {
      await page.evaluate(
        (top) => scrollTo({ top, behavior: "instant" }),
        position,
      );
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
      const tile = Path.join(
        directory,
        `${String(index + 1).padStart(3, "0")}.png`,
      );
      const tileHeight = Math.min(viewport.height, geometry.height - position);
      // fullPage + clip uses document coordinates and retains real horizontal
      // overflow without widening the viewport or changing responsive layout.
      await page.screenshot({
        path: tile,
        fullPage: true,
        clip: { x: 0, y: position, width: geometry.width, height: tileHeight },
        animations: "disabled",
      });
      const saved = await sharp(tile, {
        limitInputPixels: width * Math.round(tileHeight * geometry.scale),
      }).metadata();
      const expectedHeight = Math.round(tileHeight * geometry.scale);
      if (saved.width !== width || saved.height !== expectedHeight)
        throw new Error(
          `Tile geometry changed at ${position}px: expected ${width}×${expectedHeight}, saved ${saved.width}×${saved.height}`,
        );
      composites.push({
        input: tile,
        left: 0,
        top: Math.round(position * geometry.scale),
      });
      if (index === 0)
        await page.evaluate(() => {
          for (const element of document.querySelectorAll("body *")) {
            const style = getComputedStyle(element);
            if (
              !(
                style.position === "fixed" ||
                (style.position === "sticky" && element.tagName === "HEADER")
              ) ||
              style.visibility === "hidden"
            )
              continue;
            element.dataset.reviewOverlay = element.style.visibility;
            element.style.visibility = "hidden";
          }
        });
    }
    const ending = await page.evaluate(() => ({
      width: Math.max(
        innerWidth,
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      height: Math.max(
        innerHeight,
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      ),
    }));
    if (ending.width !== geometry.width || ending.height !== geometry.height)
      throw new Error(
        `Document geometry changed while stitching: ${geometry.width}×${geometry.height} to ${ending.width}×${ending.height}`,
      );
    await sharp({
      limitInputPixels: width * height,
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toFile(destination);
    await Files.rm(directory, { recursive: true });
    return {
      method: "document-tiles",
      width,
      height,
      tiles: positions.length,
      cssWidth: geometry.width,
      cssHeight: geometry.height,
    };
  } finally {
    await restoreCaptureLayout(page);
  }
};
