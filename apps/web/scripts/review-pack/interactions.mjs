import * as Files from "node:fs/promises";
import * as Path from "node:path";
import { resultify } from "@zenncore/utils";
import * as Capture from "./capture.mjs";

export const files = [
  "platform--desktop.png",
  "solutions--desktop.png",
  "channels--desktop.png",
  "integrations--desktop.png",
  "resources--desktop.png",
  "interest-form--desktop.png",
  "demo-step-1--desktop.png",
  "navigation--mobile.png",
];

export const validate = async (entries, output) => {
  const failures = entries.filter((entry) => entry.error);
  const recorded = entries.flatMap((entry) => (entry.file ? [entry.file] : []));
  const missing = files.filter((file) => !recorded.includes(file));
  const unexpected = recorded.filter((file) => !files.includes(file));
  if (
    failures.length ||
    missing.length ||
    unexpected.length ||
    recorded.length !== files.length
  )
    throw new Error(
      `Interaction pack is incomplete: ${[...missing, ...unexpected, ...failures.map((entry) => `${entry.name}: ${entry.error}`)].join(", ") || "duplicate captures"}`,
    );
  for (const file of files) {
    const saved = await resultify(() =>
      Files.stat(Path.join(output, "screens/menus", file)),
    );
    if (!saved.success || !saved.data.isFile() || !saved.data.size)
      throw new Error(`Interaction screenshot is missing: ${file}`);
  }
};

const settle = (page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 350));
  });

const record = async ({ page, output, name, mode, file }) => {
  await settle(page);
  await page.screenshot({
    path: Path.join(output, "screens/menus", file),
    animations: "disabled",
  });
  return {
    captured: new Date().toISOString(),
    name,
    mode,
    file,
    route: new URL(page.url()).pathname,
    title: await page.title(),
    device: {
      viewport: page.viewportSize(),
      deviceScaleFactor: await page.evaluate(() => devicePixelRatio),
    },
    ...(await page.evaluate(() => ({
      fonts: document.fonts.status,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    }))),
  };
};

export const capture = async ({ browsers, devices, base, output }) => {
  await Files.mkdir(Path.join(output, "screens/menus"), { recursive: true });
  const entries = [];
  const context = await browsers.desktop.newContext({
    ...devices.desktop,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(new URL("/", base).href, { waitUntil: "domcontentloaded" });
  await Capture.prepare(page);
  const triggers = await page
    .locator("[data-menu-trigger]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        key: element.dataset.menuTrigger,
        label: element.textContent.trim(),
      })),
    );
  for (const trigger of triggers) {
    const captured = await resultify(async () => {
      await page.locator(`[data-menu-trigger="${trigger.key}"]`).click();
      await page
        .locator(`.marketing-mega-content[data-menu="${trigger.key}"]`)
        .waitFor({ state: "visible" });
      const entry = await record({
        page,
        output,
        name: trigger.label,
        mode: "desktop",
        file: `${trigger.key}--desktop.png`,
      });
      await page.keyboard.press("Escape");
      return entry;
    });
    entries.push(
      captured.success
        ? captured.data
        : {
            name: trigger.label,
            mode: "desktop",
            error: captured.error.message,
          },
    );
  }
  if (triggers.length !== 5)
    entries.push({
      name: "Desktop mega-menu inventory",
      mode: "desktop",
      error: `Expected five menu triggers; found ${triggers.length}`,
    });
  await page.goto(new URL("/integrations", base).href, {
    waitUntil: "domcontentloaded",
  });
  await Capture.prepare(page);
  const interest = await resultify(async () => {
    await page
      .getByRole("button", { name: /tell me when|avísame/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("form").waitFor({ state: "visible" });
    return record({
      page,
      output,
      name: "Coming-soon interest form",
      mode: "desktop",
      file: "interest-form--desktop.png",
    });
  });
  entries.push(
    interest.success
      ? interest.data
      : {
          name: "Coming-soon interest form",
          mode: "desktop",
          error: interest.error.message,
        },
  );
  await page.keyboard.press("Escape");
  await page.goto(new URL("/demo", base).href, {
    waitUntil: "domcontentloaded",
  });
  await Capture.prepare(page);
  await page.locator("main form").first().scrollIntoViewIfNeeded();
  entries.push(
    await record({
      page,
      output,
      name: "Demo form - step 1",
      mode: "desktop",
      file: "demo-step-1--desktop.png",
    }),
  );
  await context.close();
  const mobile = await browsers.mobile.newContext({
    ...devices.mobile,
    reducedMotion: "reduce",
  });
  const sheet = await mobile.newPage();
  await sheet.goto(new URL("/", base).href, { waitUntil: "domcontentloaded" });
  await Capture.prepare(sheet);
  const menu = await resultify(async () => {
    await sheet
      .getByRole("button", { name: /^(open menu|abrir menú)$/i })
      .click();
    await sheet.getByRole("dialog").waitFor({ state: "visible" });
    return record({
      page: sheet,
      output,
      name: "Mobile navigation sheet",
      mode: "mobile",
      file: "navigation--mobile.png",
    });
  });
  entries.push(
    menu.success
      ? menu.data
      : {
          name: "Mobile navigation sheet",
          mode: "mobile",
          error: menu.error.message,
        },
  );
  await mobile.close();
  await Files.writeFile(
    Path.join(output, "menus.json"),
    JSON.stringify(entries, null, 2),
  );
  return entries;
};
