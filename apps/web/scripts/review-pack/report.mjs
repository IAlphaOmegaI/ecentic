import * as Child from "node:child_process";
import * as Files from "node:fs/promises";
import * as Path from "node:path";
import * as Util from "node:util";
import { resultify } from "@zenncore/utils";
import * as Pdf from "./pdf.mjs";
import * as Todos from "./todos.mjs";

const markup = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const comma = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const title = (entry) => entry.headings[0] || entry.title || entry.route;
const matches = (record, text) =>
  record.sources.some((source) => source.text === text);
const destination = (entry) =>
  entry.url && URL.canParse(entry.url)
    ? new URL(entry.url).pathname
    : entry.route;
const status = (entry) => {
  const views = entry.views ?? [entry];
  switch (true) {
    case /^(?:\/es)?\/review-pack-not-found$/.test(entry.route):
      return views.every((view) => view.status === 404) ? "404" : "missing";
    case views.some((view) => !view.status || view.status >= 400):
      return "missing";
    case entry.words < 80 ||
      /data pending|datos pendientes|coming soon|próximamente/i.test(
        entry.headings.join(" "),
      ):
      return "placeholder";
    default:
      return "built";
  }
};
const group = (entries) =>
  [...new Set(entries.map((entry) => entry.route))].map((route) => {
    const views = entries.filter((entry) => entry.route === route);
    const entry = views.find((view) => view.mode === "desktop") ?? views[0];
    return {
      ...entry,
      views,
      placeholders: [...new Set(views.flatMap((view) => view.placeholders))],
    };
  });

export const write = async ({
  project,
  output,
  entries,
  menus = [],
  library,
  sharp,
  baseline = null,
  notes = [],
  commits = null,
  merger = "pdfunite",
}) => {
  const registry = await Todos.collect(project);
  const pages = group(entries)
    .map((page) => {
      const source = Todos.forPage(registry, page.route);
      return {
        ...page,
        todos: source,
        todoCount:
          source.length +
          page.placeholders.filter(
            (text) => !source.some((record) => matches(record, text)),
          ).length,
        placeholders: [
          ...new Set([
            ...page.placeholders,
            ...source.map((record) => record.text),
          ]),
        ],
      };
    })
    .sort((left, right) => Number(left.number) - Number(right.number));
  const uniqueTodos = new Set([
    ...pages.flatMap((page) => [
      ...page.todos.map((record) => record.id),
      ...page.placeholders.filter(
        (text) => !page.todos.some((record) => matches(record, text)),
      ),
    ]),
    ...registry.unmapped.map((record) => record.id),
  ]).size;
  const pageTodoOccurrences = pages.reduce(
    (sum, page) => sum + page.todoCount,
    0,
  );
  const ordered = pages.flatMap((page) =>
    ["desktop", "mobile"]
      .map((mode) => page.views.find((view) => view.mode === mode))
      .filter(Boolean),
  );
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
  await Files.mkdir(Path.join(output, "screens/thumbnails"), {
    recursive: true,
  });
  for (const entry of ordered) {
    const file = Path.join(output, "screens", entry.file);
    const options = {
      limitInputPixels: entry.image.width * entry.image.height,
    };
    const image = await sharp(file, options).metadata();
    const height = Math.min(
      image.height,
      Math.round(entry.device.viewport.height * entry.device.deviceScaleFactor),
    );
    await sharp(file, options)
      .extract({ left: 0, top: 0, width: image.width, height })
      .resize({ width: 640 })
      .webp({ quality: 85 })
      .toFile(
        Path.join(
          output,
          "screens/thumbnails",
          entry.file.replace(/\.png$/, ".webp"),
        ),
      );
  }
  const issues = pages.flatMap((page) =>
    page.views.flatMap((view) => [
      ...view.errors.map(
        (error) => `${page.route} ${view.mode}: runtime error - ${error}`,
      ),
      ...(view.overflow
        ? [`${page.route} ${view.mode}: ${view.overflow}px horizontal overflow`]
        : []),
      ...view.images.broken.map(
        (image) =>
          `${page.route} ${view.mode}: image ${image.state === "pending" ? "did not finish loading" : "failed"} - ${image.source}`,
      ),
      ...(view.media ?? []).flatMap((media) => [
        ...(media.error
          ? [
              `${page.route} ${view.mode}: video load error - ${media.source}: ${media.error.message || media.error.code}`,
            ]
          : []),
        ...(media.posterError
          ? [
              `${page.route} ${view.mode}: existing video poster failed - ${media.poster}: ${media.posterError}`,
            ]
          : []),
        ...(media.source && media.readyState < 2 && !media.error
          ? [
              `${page.route} ${view.mode}: video did not decode before capture - ${media.source}`,
            ]
          : []),
      ]),
      ...(/^(?:\/es)?\/(?:review-pack-not-found|research\/ai-shopping-simulations)$/.test(
        view.route,
      ) && view.status !== 404
        ? [
            `${page.route} ${view.mode}: expected a genuine HTTP 404, received ${view.status}`,
          ]
        : []),
      ...(!/^(?:\/es)?\/(?:review-pack-not-found|research\/ai-shopping-simulations)$/.test(
        view.route,
      ) &&
      (!view.status || view.status >= 400)
        ? [
            `${page.route} ${view.mode}: unexpected HTTP status ${view.status ?? "unavailable"}`,
          ]
        : []),
      ...["title", "description"]
        .filter((property) => view.status < 400 && !view[property])
        .map((property) => `${page.route} ${view.mode}: missing ${property}`),
      ...(view.readiness?.ready === false
        ? [
            `${page.route} ${view.mode}: layout or scroll-control readiness did not settle before audit`,
          ]
        : []),
      ...(view.fonts.status !== "loaded" ||
      Object.values(view.styles).some((style) => style.fontAvailable === false)
        ? [`${page.route} ${view.mode}: a used font did not finish loading`]
        : []),
      ...(view.consent &&
      (view.consent.banner || view.consent.decision === "granted")
        ? [`${page.route} ${view.mode}: cookie consent was not declined`]
        : []),
      ...(view.headings.length !== 1
        ? [`${page.route} ${view.mode}: ${view.headings.length} H1 elements`]
        : []),
      ...(!view.accessibility.available
        ? [
            `${page.route} ${view.mode}: axe unavailable - ${view.accessibility.reason}`,
          ]
        : []),
    ]),
  );
  const violations = ordered.flatMap((entry) =>
    (entry.accessibility.violations ?? []).map((violation) => ({
      route: entry.route,
      mode: entry.mode,
      id: violation.id,
      impact: violation.impact,
      count: violation.nodes.length,
      help: violation.help,
      url: violation.helpUrl,
      metadata: `metadata/${entry.file.replace(/\.png$/, ".json")}`,
      nodes: violation.nodes.map((node) => ({
        html: node.html,
        target: node.target,
        failure: node.failureSummary,
      })),
    })),
  );
  const sharedMetadata = ["title", "description"].flatMap((property) =>
    [
      ...new Set(
        pages
          .filter((page) => page.status < 400)
          .map((page) => page[property])
          .filter(Boolean),
      ),
    ].flatMap((value) => {
      const matching = pages.filter(
        (page) => page.status < 400 && page[property] === value,
      );
      return matching.length > 1
        ? [
            {
              field: property,
              value,
              routes: matching.map((page) => page.route),
              redirectAlias: new Set(matching.map(destination)).size === 1,
              destination:
                new Set(matching.map(destination)).size === 1
                  ? destination(matching[0])
                  : null,
            },
          ]
        : [];
    }),
  );
  const redirects = ordered
    .filter((entry) => destination(entry) !== entry.route)
    .map((entry) => ({
      route: entry.route,
      mode: entry.mode,
      destination: destination(entry),
    }));
  const duplicates = sharedMetadata.map((record) =>
    record.redirectAlias
      ? `Redirect aliases share ${record.field}: ${record.routes.join(", ")} resolve to ${record.destination}.`
      : `Shared ${record.field}: ${record.routes.join(", ")}`,
  );
  const severityCounts = Object.fromEntries(
    ["critical", "serious", "moderate", "minor", "unknown"].map((severity) => [
      severity,
      {
        rules: violations.filter(
          (entry) => (entry.impact ?? "unknown") === severity,
        ).length,
        nodes: violations
          .filter((entry) => (entry.impact ?? "unknown") === severity)
          .reduce((sum, entry) => sum + entry.count, 0),
      },
    ]),
  );
  await Files.writeFile(
    Path.join(output, "metadata-checks.json"),
    JSON.stringify(
      {
        routes: pages.length,
        views: ordered.length,
        h1Failures: ordered
          .filter((entry) => entry.headings.length !== 1)
          .map((entry) => ({
            route: entry.route,
            mode: entry.mode,
            count: entry.headings.length,
          })),
        missingMetadata: ordered.flatMap((entry) =>
          ["title", "description"]
            .filter((field) => entry.status < 400 && !entry[field])
            .map((field) => ({ route: entry.route, mode: entry.mode, field })),
        ),
        statuses: Object.fromEntries(
          ["built", "placeholder", "missing", "404"].map((value) => [
            value,
            pages.filter((page) => status(page) === value).length,
          ]),
        ),
        redirects,
        sharedMetadata,
      },
      null,
      2,
    ),
  );
  const execution = Util.promisify(Child.execFile);
  const reference = await (async () => {
    if (commits) return commits;
    for (const candidate of [
      "origin/main",
      "origin/master",
      "main",
      "master",
    ]) {
      const base = await resultify(() =>
        execution("git", ["merge-base", "HEAD", candidate], { cwd: project }),
      );
      if (base.success) return base.data.stdout.trim();
    }
    return null;
  })();
  const history = await resultify(() =>
    execution(
      "git",
      [
        "log",
        "--format=%h %s",
        "--reverse",
        "--first-parent",
        ...(reference ? [`${reference}..HEAD`] : []),
      ],
      { cwd: project, maxBuffer: 8 * 1024 * 1024 },
    ),
  );
  const rows = [
    [
      "number",
      "route",
      "title tag",
      "H1",
      "word count",
      "open TODOs",
      "status",
    ],
    ...pages.map((page) => [
      page.number,
      page.route,
      page.title,
      page.headings.join(" | "),
      page.words,
      page.todoCount,
      status(page),
    ]),
  ];
  await Files.writeFile(
    Path.join(output, "pages.csv"),
    `${rows.map((row) => row.map(comma).join(",")).join("\n")}\n`,
  );
  await Files.writeFile(
    Path.join(output, "comments.md"),
    "Write notes under each page, or annotate review.pdf. Refer to sections by their [01], [02] numbers.\n\n" +
      pages
        .map(
          (page) =>
            `## ${page.number} ${title(page)} (${page.route})\n\n- Desktop:\n- Mobile:\n`,
        )
        .join("\n"),
  );
  await Files.writeFile(
    Path.join(output, "TODO.md"),
    `# Open inputs\n\n${uniqueTodos} distinct open inputs; ${pageTodoOccurrences} page occurrences. Source keys and explicit aliases deduplicate EN/ES questions. Exact questions are read from raw catalog fragments, including values omitted from production HTML.\n\nOwner labels distinguish explicit ownership from suggested routing. Research methods belong to Alvi per the brief. Otherwise Xhurian confirms the answer or assigns its owner; a routing suggestion is not a claim that the source assigned that person.\n\n` +
      pages
        .map((page) => {
          const known = page.todos.map(
            (record) =>
              `- **${record.owner.name}:** ${record.text}\n  - ${record.owner.basis}.\n${record.sources.map((source) => `  - Source: \`${source.file}\` → \`${source.key}\`${source.text !== record.text ? `; wording: ${source.text}` : ""}.`).join("\n")}`,
          );
          const extra = page.placeholders
            .filter(
              (text) => !page.todos.some((record) => matches(record, text)),
            )
            .map(
              (text) =>
                `- **Xhurian (owner confirmation):** ${text}\n  - Visible in the captured DOM; no source-key mapping was found.`,
            );
          return `## ${page.number} ${page.route}\n\n${[...known, ...extra].join("\n") || "No open source or rendered TODOs."}\n`;
        })
        .join("\n") +
      (registry.unmapped.length
        ? `\n## Unmapped source inputs\n\nThese remain in source and need a public-page mapping or explicit archival decision.\n\n${registry.unmapped.map((record) => `- **${record.owner.name}:** ${record.text} (${record.locale}, \`${record.key}\`). ${record.owner.basis}.`).join("\n")}\n`
        : ""),
  );
  await Files.writeFile(
    Path.join(output, "source-todos.json"),
    JSON.stringify(registry, null, 2),
  );
  await Files.writeFile(
    Path.join(output, "CHANGES.md"),
    "# Branch commits\n\n" +
      (history.success
        ? history.data.stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => `- ${line}`)
            .join("\n")
        : `Could not read git history: ${history.error.message}`) +
      "\n",
  );
  const comparison = baseline
    ? await compare({ output, baseline, entries: ordered })
    : [];
  await Files.writeFile(
    Path.join(output, "UI-NOTES.md"),
    "# Review notes\n\n" +
      [
        "This pack captures signed-out public pages. Cookie consent is declined; forms are opened but never submitted.",
        "Desktop uses Chromium at 1440 × 900 / DSF 2. Mobile uses WebKit and Playwright's unmodified iPhone 14 preset. Both use reduced motion.",
        "Long pages use native-resolution document tiles without resizing the viewport. Real horizontal overflow remains in the image and is reported. The sticky header/fixed overlays appear once; other sticky content uses its normal flow only in the capture browser. Scrollbar chrome is omitted. Videos use their existing decoded poster when provided; original readiness and failure evidence remain recorded.",
        "Exact TODOs come from raw source fragments, so production omission and localized pending labels do not conceal unresolved inputs. Source-based counts may include a conditional value that was absent from this screenshot.",
        "PDF pages preserve screenshot proportions and use high-quality image compression within Preview's page-size limits. Original PNGs remain available. Headers contain page number, route, title, viewport and capture date.",
        ...menus
          .filter((entry) => entry.error)
          .map(
            (entry) => `${entry.name}: capture unavailable - ${entry.error}`,
          ),
        ...issues,
        ...duplicates,
        ...violations.map(
          (violation) =>
            `Axe ${violation.impact}: ${violation.route} ${violation.mode} - ${violation.id} (${violation.count} nodes): ${violation.help}. [Full node evidence](${violation.metadata}). Affected markup: ${violation.nodes.map((node) => `\`${node.html.replaceAll("`", "'")}\``).join("; ")}`,
        ),
        ...comparison,
      ]
        .map((line) => `- ${line}`)
        .join("\n") +
      "\n\n" +
      notes.join("\n\n") +
      "\n",
  );
  await Files.writeFile(
    Path.join(output, "axe-summary.json"),
    JSON.stringify(
      {
        violations,
        severityCounts,
        serious: violations.filter((entry) =>
          ["serious", "critical"].includes(entry.impact),
        ).length,
        unavailable: ordered.filter((entry) => !entry.accessibility.available)
          .length,
      },
      null,
      2,
    ),
  );
  const cards = pages
    .map(
      (page) =>
        `<article id="page-${page.number}"><header><span>${page.number}</span><h2>${markup(page.route)}</h2><p>${markup(title(page))}</p><small>${page.todoCount} open TODOs · ${markup(status(page))}</small></header><div class="views">${page.views.map((view) => `<a href="screens/${markup(view.file)}"><img loading="lazy" src="screens/thumbnails/${markup(view.file.replace(/\.png$/, ".webp"))}" alt="${markup(view.route)} ${view.mode}"><span>${view.mode} · ${view.image.width} × ${view.image.height}</span></a>`).join("")}</div></article>`,
    )
    .join("\n");
  await Files.writeFile(
    Path.join(output, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ecentic website review · ${date}</title><style>body{margin:0;background:#f8f9fa;color:#16181d;font:16px/1.5 system-ui}main{max-width:1480px;margin:auto;padding:32px}h1{font-size:40px;margin:0 0 12px}a{color:#0a5bd3}nav{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:24px}article{border:1px solid #dedede;background:white;min-width:0}header{padding:20px}header span{font-size:24px;color:#0a5bd3}h2{font-size:20px;margin:8px 0}p{margin:8px 0}.views{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#dedede}.views a{display:flex;flex-direction:column;background:white;min-width:0}.views img{width:100%;height:320px;object-fit:contain;object-position:top}.views span{padding:12px;font-size:13px}@media(max-width:500px){main{padding:16px}.grid{grid-template-columns:1fr}}</style><main><h1>ecentic website review</h1><p>${date} · ${pages.length} routes · ${ordered.length + menus.filter((entry) => entry.file).length} screenshots · ${uniqueTodos} open inputs · ${pageTodoOccurrences} page TODO occurrences</p><nav><a href="review.pdf">Annotated review PDF</a><a href="pages.csv">Page inventory</a><a href="comments.md">Comments</a><a href="TODO.md">Open inputs</a><a href="UI-NOTES.md">UI notes</a><a href="CHANGES.md">Commits</a></nav><div class="grid">${cards}</div>${
      menus.length
        ? `<h2>Menus and forms</h2><div class="views">${menus
            .filter((entry) => entry.file)
            .map(
              (entry) =>
                `<a href="screens/menus/${markup(entry.file)}"><img loading="lazy" src="screens/menus/${markup(entry.file)}" alt="${markup(entry.name)}"><span>${markup(entry.name)}</span></a>`,
            )
            .join("")}</div>`
        : ""
    }</main></html>`,
  );
  const count = await Pdf.write({
    output,
    entries: ordered,
    menus,
    library,
    sharp,
    date,
    merger,
  });
  return {
    routes: pages.length,
    screenshots: count,
    todos: uniqueTodos,
    pageTodoOccurrences,
    serious: violations.filter((entry) =>
      ["critical", "serious"].includes(entry.impact),
    ).length,
    severityCounts,
    sharedMetadata,
    redirects,
    issues,
  };
};

export const compare = async ({ output, baseline, entries }) => {
  const content = await resultify(() =>
    Files.readFile(Path.join(baseline, "manifest.json"), "utf8"),
  );
  if (!content.success)
    return [`Baseline could not be read: ${content.error.message}`];
  const previous = JSON.parse(content.data).entries;
  const differences = entries.flatMap((entry) => {
    const before = previous.find(
      (page) => page.route === entry.route && page.mode === entry.mode,
    );
    if (!before) return [];
    const changed = ["height", "overflow", "headings", "styles"].filter(
      (property) =>
        JSON.stringify(before[property]) !== JSON.stringify(entry[property]),
    );
    return changed.length
      ? [
          {
            route: entry.route,
            mode: entry.mode,
            changed,
            before: Object.fromEntries(
              changed.map((key) => [key, before[key]]),
            ),
            after: Object.fromEntries(changed.map((key) => [key, entry[key]])),
          },
        ]
      : [];
  });
  await Files.writeFile(
    Path.join(output, "comparison.json"),
    JSON.stringify(differences, null, 2),
  );
  return differences.map(
    (entry) =>
      `Before/after ${entry.route} ${entry.mode}: changed ${entry.changed.join(", ")}; inspect comparison.json and both screenshots for visual impact.`,
  );
};
