import { createHash } from "node:crypto";
import { dirname, posix } from "node:path";
import ts from "typescript";

export type Finding = {
  rule: "C1" | "C4" | "C6" | "registry" | "syntax";
  check: string;
  severity: "warning" | "advisory" | "error";
  file: string;
  line: number;
  column: number;
  message: string;
  evidence: string[];
  related?: { file: string; line: number; column: number }[];
  consumerFiles?: string[];
};

export type Source = { file: string; tree: ts.SourceFile };
export type Target = {
  id: string;
  file: string;
  component?: string;
  case?: string;
  role:
    | "ordered-narrative"
    | "ordered-workflow"
    | "connected-pattern"
    | "selector"
    | "record-comparison";
  purpose: string;
  selection?: string;
};
export type Renderer = {
  id: string;
  file: string;
  component?: string;
  kind: "image" | "typography" | "procedural-path" | "protocol-text";
  subject: string;
  source?: { file: string; symbol: string; description: string };
};
export type VisualContract = {
  id: string;
  file: string;
  component: string;
  case?: string;
  purpose: string;
  typography?: { tags: string[]; technicalExpressions?: string[] };
  heading?: { component: string; tag: string };
  rowIcons?: { containerTag: string; rowTag: string; importSource: string };
};
export type ContractCheck = {
  check: string;
  status: "checked" | "not-checked";
  observed: number;
  reason: string;
};
export type Registry = {
  version: 1;
  sourceRoot: string;
  publicRoots: string[];
  exclude: string[];
  seams: string[];
  processes: Target[];
  visualContracts?: VisualContract[];
  artwork: {
    assetPrefix: string;
    provenance: string[];
    renderers: Renderer[];
    legacySources?: { file: string; subject: string }[];
  };
};
export type Coverage = {
  id: string;
  file: string;
  role: string;
  matched: boolean;
  observed: number;
  notes: string[];
  checks?: ContractCheck[];
};
export type Provenance = {
  file: string;
  subject: string;
  method: string;
  source: string;
  asset: string;
  sourceSha256?: string;
  assetSha256?: string;
};

type Element = ts.JsxElement | ts.JsxSelfClosingElement;

export const parseSource = (file: string, text: string): Source => ({
  file,
  tree: ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") || file.endsWith(".svg")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  ),
});

const descendants = <Node extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is Node,
): Node[] => {
  const matches: Node[] = [];
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
};

const elements = (root: ts.Node) =>
  descendants(
    root,
    (node): node is Element =>
      ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node),
  );
const opening = (element: Element) =>
  ts.isJsxElement(element) ? element.openingElement : element;
const tag = (element: Element) => opening(element).tagName.getText();
const attribute = (element: Element, name: string) =>
  opening(element).attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  );
const literals = (root: ts.Node) =>
  descendants(root, (node): node is ts.StringLiteralLike =>
    ts.isStringLiteralLike(node),
  );
const tokens = (element: Element) => {
  const classes = attribute(element, "className");
  return classes
    ? literals(classes).flatMap((value) => value.text.split(/\s+/))
    : [];
};
const location = (source: Source, node: ts.Node) => {
  const position = source.tree.getLineAndCharacterOfPosition(
    node.getStart(source.tree),
  );
  return {
    file: source.file,
    line: position.line + 1,
    column: position.character + 1,
  };
};
const finding = (
  source: Source,
  node: ts.Node,
  value: Omit<Finding, "file" | "line" | "column">,
): Finding => ({ ...value, ...location(source, node) });
const unwrap = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression) ||
  ts.isAsExpression(expression) ||
  ts.isSatisfiesExpression(expression) ||
  ts.isNonNullExpression(expression)
    ? unwrap(expression.expression)
    : expression;

const scopes = (
  source: Source,
  target: { component?: string; case?: string },
): ts.Node[] => {
  const components = target.component
    ? descendants(
        source.tree,
        (node): node is ts.VariableDeclaration | ts.FunctionDeclaration =>
          (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
          node.name?.getText() === target.component,
      )
    : [source.tree];
  if (!target.case) return components;
  return components.flatMap((component) =>
    descendants(
      component,
      (node): node is ts.CaseClause =>
        ts.isCaseClause(node) &&
        ts.isStringLiteral(node.expression) &&
        node.expression.text === target.case,
    ),
  );
};

const returned = (
  callback: ts.ArrowFunction | ts.FunctionExpression,
): ts.Expression[] => {
  if (!ts.isBlock(callback.body)) return [unwrap(callback.body)];
  const expressions: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression)
      expressions.push(unwrap(node.expression));
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return expressions;
};

const mappedChildren = (element: ts.JsxElement, rowTag: string) =>
  element.children.flatMap((child, position) => {
    if (!ts.isJsxExpression(child) || !child.expression) return [];
    const expression = unwrap(child.expression);
    if (
      !ts.isCallExpression(expression) ||
      !ts.isPropertyAccessExpression(expression.expression) ||
      expression.expression.name.text !== "map"
    )
      return [];
    const callback = expression.arguments[0];
    if (
      !callback ||
      (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
    )
      return [];
    const collection = expression.expression.expression;
    return returned(callback).flatMap((row) =>
      (ts.isJsxElement(row) || ts.isJsxSelfClosingElement(row)) &&
      tag(row) === rowTag
        ? [
            {
              row,
              callback,
              position,
              collection,
            },
          ]
        : [],
    );
  });

const mappedRows = (element: ts.JsxElement) => mappedChildren(element, "li");

const followsWithNonRow = (parent: ts.JsxElement, position: number) =>
  parent.children.slice(position + 1).flatMap((child) => {
    if (ts.isJsxText(child)) return [];
    if (ts.isJsxExpression(child) && !child.expression) return [];
    return elements(child).filter(
      (element) =>
        tag(element) !== "li" &&
        !elements(child).some(
          (ancestor) =>
            ancestor !== element &&
            element.pos > ancestor.pos &&
            element.end < ancestor.end,
        ),
    );
  });

const hasIndexOverride = (
  row: Element,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  collection: ts.Expression,
) => {
  const index = callback.parameters[1]?.name.getText();
  const classes = attribute(row, "className");
  if (!index || !classes) return false;
  return descendants(classes, ts.isBinaryExpression).some((expression) => {
    if (
      expression.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken ||
      !literals(expression.right).some((literal) =>
        literal.text.split(/\s+/).includes("border-b-0"),
      )
    )
      return false;
    const condition = unwrap(expression.left);
    if (
      !ts.isBinaryExpression(condition) ||
      ![
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken,
      ].includes(condition.operatorToken.kind)
    )
      return false;
    const terminal =
      condition.left.getText() === index
        ? unwrap(condition.right)
        : condition.right.getText() === index
          ? unwrap(condition.left)
          : undefined;
    return (
      !!terminal &&
      ts.isBinaryExpression(terminal) &&
      terminal.operatorToken.kind === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(terminal.right) &&
      terminal.right.text === "1" &&
      descendants(terminal.left, ts.isPropertyAccessExpression).some(
        (property) =>
          property.name.text === "length" &&
          property.expression.getText() === collection.getText(),
      )
    );
  });
};

/** Only mapped list rows with a following rendered non-row can invalidate :last-child. */
export const checkSeams = (source: Source): Finding[] =>
  elements(source.tree).flatMap((parent) => {
    if (!ts.isJsxElement(parent) || !["ol", "ul"].includes(tag(parent)))
      return [];
    return mappedRows(parent).flatMap(
      ({ row, position, callback, collection }) => {
        if (
          !tokens(row).some((token) => /(?:^|:)last:border-b-0$/.test(token)) ||
          hasIndexOverride(row, callback, collection)
        )
          return [];
        const following = followsWithNonRow(parent, position);
        if (!following.length) return [];
        return [
          finding(source, attribute(row, "className") ?? row, {
            rule: "C1",
            check: "terminal-row-selector",
            severity: "advisory",
            message:
              "A mapped li uses last:border-b-0 before a non-row sibling. If that sibling renders, the final row is not :last-child; select it by type or index after reviewing seam ownership.",
            evidence: following.map(
              (element) =>
                `<${tag(element)}> follows the mapped rows at line ${location(source, element).line}.`,
            ),
            related: following.map((element) => location(source, element)),
          }),
        ];
      },
    );
  });

/** Compatibility adapter shared with the runtime audit's source preflight. */
export const roadmapSourceAdvisories = (text: string, filename: string) =>
  checkSeams(parseSource(filename, text)).map((item) => ({
    source: item.file,
    line: item.line,
    trailingLine: item.related?.[0]?.line ?? item.line,
    message: item.message,
  }));

const importedTag = (source: Source, element: Element) => {
  const name = tag(element);
  const binding = descendants(source.tree, ts.isImportSpecifier).find(
    (specifier) => specifier.name.text === name,
  );
  return binding?.propertyName?.text ?? name;
};
const hasConnector = (root: ts.Node) =>
  elements(root).some((element) => {
    if (["ConnectedJourney", "AsciiRoad", "FlowDiagram"].includes(tag(element)))
      return true;
    const classes = tokens(element);
    return (
      classes.some((value) => value.split(":").at(-1) === "absolute") &&
      classes.some((value) =>
        ["w-px", "h-px", "border-l", "border-t"].includes(
          value.split(":").at(-1) ?? "",
        ),
      )
    );
  });

const tabEvidence = (source: Source, root: ts.Node) =>
  elements(root)
    .filter((element) => importedTag(source, element) === "Tab")
    .map(
      (element) =>
        attribute(element, "value")?.initializer?.getText() ??
        element.getText().slice(0, 100),
    );

const technicalLiteral = (text: string) =>
  /^(?:https?:\/\/\S+|\/[\w./:{}?=&%~-]+|(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)(?:\s+\S+)?|[a-z]+\/[a-z0-9.+-]+|(?:v|>=?|<=?|~|\^)?\d+\.\d+(?:\.\d+)?|[a-z]+(?:\.[a-z][a-z\d_-]*){2,})$/.test(
    text.trim(),
  );

/** A code-only child is technical; surrounding ordinary prose still inherits the font. */
const ordinaryContent = (
  element: Element,
  technical: readonly string[],
): boolean => {
  if (["code", "pre"].includes(tag(element))) return false;
  if (!ts.isJsxElement(element)) return false;
  return element.children.some((child) => {
    if (ts.isJsxText(child))
      return !!child.text.trim() && !technicalLiteral(child.text);
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child))
      return ordinaryContent(child, technical);
    if (!ts.isJsxExpression(child) || !child.expression) return false;
    const expression = unwrap(child.expression);
    if (technical.includes(expression.getText())) return false;
    if (ts.isStringLiteralLike(expression))
      return !!expression.text.trim() && !technicalLiteral(expression.text);
    return true;
  });
};

type IconResolution = "canonical" | "other" | "unknown";
const resolveIcon = (
  source: Source,
  name: string,
  context: ts.Node,
  packageName: string,
  visited = new Set<string>(),
): IconResolution => {
  if (visited.has(name)) return "unknown";
  const imports = source.tree.statements
    .filter(ts.isImportDeclaration)
    .filter(
      (statement) =>
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === packageName,
    );
  if (
    imports.some(
      (statement) =>
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings) &&
        statement.importClause.namedBindings.elements.some(
          (binding) => binding.name.text === name,
        ),
    )
  )
    return "canonical";
  const declaration = descendants(source.tree, ts.isVariableDeclaration)
    .filter(
      (candidate) =>
        candidate.name.getText() === name &&
        candidate.pos < context.pos &&
        candidate.parent.parent.parent.pos <= context.pos &&
        candidate.parent.parent.parent.end >= context.end,
    )
    .sort((first, second) => second.pos - first.pos)[0];
  if (!declaration?.initializer) return "unknown";
  const next = new Set([...visited, name]);
  const inspect = (input: ts.Expression): IconResolution => {
    const expression = unwrap(input);
    if (ts.isIdentifier(expression))
      return resolveIcon(source, expression.text, context, packageName, next);
    if (ts.isElementAccessExpression(expression))
      return inspect(expression.expression);
    if (ts.isPropertyAccessExpression(expression)) {
      const namespace = expression.expression.getText();
      return imports.some(
        (statement) =>
          statement.importClause?.namedBindings &&
          ts.isNamespaceImport(statement.importClause.namedBindings) &&
          statement.importClause.namedBindings.name.text === namespace,
      )
        ? "canonical"
        : "unknown";
    }
    const possibilities = ts.isArrayLiteralExpression(expression)
      ? expression.elements
      : ts.isBinaryExpression(expression) &&
          [
            ts.SyntaxKind.QuestionQuestionToken,
            ts.SyntaxKind.BarBarToken,
          ].includes(expression.operatorToken.kind)
        ? [expression.left, expression.right]
        : [];
    if (possibilities.length) {
      const states = possibilities.map(inspect);
      return states.every((state) => state === "canonical")
        ? "canonical"
        : states.includes("other")
          ? "other"
          : "unknown";
    }
    if (
      ts.isArrowFunction(expression) ||
      ts.isFunctionExpression(expression) ||
      ts.isJsxElement(expression)
    )
      return "other";
    return "unknown";
  };
  return inspect(declaration.initializer);
};

/** Semantic roles are registered; source evidence never claims rendered visual acceptance. */
export const checkVisualContracts = (
  source: Source,
  contract: VisualContract,
): { findings: Finding[]; coverage: Coverage } => {
  const selected = scopes(source, contract);
  const checks: ContractCheck[] = [];
  const findings: Finding[] = [];
  const coverage: Coverage = {
    id: contract.id,
    file: source.file,
    role: "typography-heading-icons",
    matched: selected.length > 0,
    observed: 0,
    notes: [contract.purpose],
    checks,
  };
  if (!selected.length)
    return {
      coverage,
      findings: [
        finding(source, source.tree, {
          rule: "registry",
          check: "visual-contract-missing",
          severity: "error",
          message: `Registered visual scope ${contract.id} was not found.`,
          evidence: [contract.component, contract.case ?? "whole component"],
        }),
      ],
    };
  const scopedElements = selected.flatMap(elements);
  if (contract.typography) {
    const prose = scopedElements.filter((element) =>
      contract.typography?.tags.includes(tag(element)),
    );
    const monospace = prose.filter(
      (element) =>
        tokens(element).some(
          (token) =>
            token.split(":").at(-1)?.replaceAll("!", "") === "font-mono",
        ) &&
        ordinaryContent(
          element,
          contract.typography?.technicalExpressions ?? [],
        ),
    );
    for (const element of monospace)
      findings.push(
        finding(source, attribute(element, "className") ?? element, {
          rule: "C6",
          check: "ordinary-copy-monospace",
          severity: "advisory",
          message:
            "A registered heading/prose role applies font-mono to ordinary copy. Keep monospace on actual technical strings and use the shared heading/body faces here.",
          evidence: [
            contract.purpose,
            `<${tag(element)}> has ${tokens(element)
              .filter((token) => token.includes("font-mono"))
              .join(" ")}.`,
          ],
        }),
      );
    checks.push({
      check: "direct-prose-typography",
      status: "checked",
      observed: prose.length,
      reason:
        "Inspected literal className/cn tokens on registered tags; code/pre-only children and explicit technical expressions are excluded.",
    });
    checks.push({
      check: "computed-or-inherited-typography",
      status: "not-checked",
      observed: prose.filter((element) => {
        const classes = attribute(element, "className");
        return classes && !literals(classes).length;
      }).length,
      reason:
        "Source tokens cannot establish inherited/computed fonts, CSS overrides, or runtime values of opaque class expressions; inspect these roles in the browser.",
    });
  }
  if (contract.heading) {
    const heading = contract.heading;
    const shared = scopedElements.filter(
      (element) => importedTag(source, element) === heading.component,
    );
    const local = scopedElements.filter(
      (element) => tag(element) === heading.tag,
    );
    for (const element of local)
      findings.push(
        finding(source, element, {
          rule: "C6",
          check: "unshared-section-heading",
          severity: "advisory",
          message: `This registered section-heading role renders a local <${heading.tag}>. Review reuse of ${heading.component} so equivalent public headings share the hierarchy.`,
          evidence: [contract.purpose],
        }),
      );
    checks.push({
      check: "shared-section-heading",
      status: shared.length || local.length ? "checked" : "not-checked",
      observed: shared.length + local.length,
      reason:
        shared.length || local.length
          ? `Resolved ${shared.length} ${heading.component} usage(s) and ${local.length} local <${heading.tag}> node(s).`
          : "The registered scope delegates its heading or has no detectable heading node; source inspection cannot certify the heading contract.",
    });
  }
  if (contract.rowIcons) {
    const iconContract = contract.rowIcons;
    const rows = scopedElements
      .filter(
        (element): element is ts.JsxElement =>
          ts.isJsxElement(element) &&
          tag(element) === iconContract.containerTag,
      )
      .flatMap((element) => mappedChildren(element, iconContract.rowTag));
    const unresolved: Element[] = [];
    for (const { row } of rows) {
      const candidates = elements(row).filter(
        (element) =>
          tag(element) === "Icon" ||
          tag(element).endsWith("Icon") ||
          tag(element) === "svg",
      );
      const states = candidates.map((element) =>
        tag(element) === "svg"
          ? "other"
          : resolveIcon(
              source,
              tag(element),
              element,
              iconContract.importSource,
            ),
      );
      if (states.includes("canonical")) continue;
      if (
        states.includes("unknown") ||
        elements(row).some(
          (element) =>
            /^[A-Z]/.test(tag(element)) &&
            !["Plus", "Button", "Link"].includes(tag(element)) &&
            !candidates.includes(element),
        )
      ) {
        unresolved.push(row);
        continue;
      }
      findings.push(
        finding(source, row, {
          rule: "C6",
          check: "missing-canonical-row-icon",
          severity: "advisory",
          message:
            "A registered subject-icon row has no resolvable canonical icon. A bare number or custom SVG does not establish the shared subject-icon pattern.",
          evidence: [
            contract.purpose,
            `Expected an icon binding from ${iconContract.importSource}.`,
          ],
        }),
      );
    }
    checks.push({
      check: "canonical-row-icon-binding",
      status: unresolved.length || !rows.length ? "not-checked" : "checked",
      observed: rows.length,
      reason: unresolved.length
        ? `${unresolved.length} mapped row(s) delegate to an opaque icon/component binding; inspect their rendered icon instead of treating them as compliant.`
        : rows.length
          ? `Resolved icon imports and local array/fallback aliases from ${iconContract.importSource}.`
          : "No directly mapped rows were found; a delegated renderer needs its own registration.",
    });
    checks.push({
      check: "icon-subject-and-alignment",
      status: "not-checked",
      observed: rows.length,
      reason:
        "Import provenance cannot prove that an icon represents the row's subject or is aligned at every viewport; visual review is required.",
    });
  }
  coverage.observed = checks
    .filter((check) => check.status === "checked")
    .reduce((total, check) => total + check.observed, 0);
  return { findings, coverage };
};

export const checkPatterns = (
  source: Source,
  target: Target,
): { findings: Finding[]; coverage: Coverage } => {
  const selected = scopes(source, target);
  const tabs = selected.flatMap((scope) =>
    elements(scope).filter(
      (element) => importedTag(source, element) === "Tabs",
    ),
  );
  const lists = selected.flatMap((scope) =>
    elements(scope).filter(
      (element): element is ts.JsxElement =>
        ts.isJsxElement(element) &&
        tag(element) === "ol" &&
        mappedRows(element).length > 0,
    ),
  );
  const coverage: Coverage = {
    id: target.id,
    file: source.file,
    role: target.role,
    matched: selected.length > 0,
    observed: tabs.length + lists.length,
    notes: [target.purpose],
  };
  if (!selected.length)
    return {
      coverage,
      findings: [
        finding(source, source.tree, {
          rule: "registry",
          check: "source-target-missing",
          severity: "error",
          message: `Registered scope ${target.id} was not found. Update the registration when its component or case is moved.`,
          evidence: [JSON.stringify(target)],
        }),
      ],
    };
  if (target.role === "selector") {
    coverage.notes.push(
      `Selection changes ${target.selection ?? "an input"}; narrative-tabs and workflow-list advisories do not apply to this scope.`,
    );
    return { coverage, findings: [] };
  }
  const findings = tabs.flatMap((element) => {
    if (
      !elements(element).some(
        (child) => importedTag(source, child) === "TabsPanel",
      ) ||
      hasConnector(element)
    )
      return [];
    const values = tabEvidence(source, element);
    if (target.role === "record-comparison") {
      const states = literals(element).map((literal) =>
        literal.text.toLowerCase(),
      );
      if (!states.includes("before") || !states.includes("after")) return [];
      return [
        finding(source, element, {
          rule: "C6",
          check: "display-before-after-tabs",
          severity: "advisory",
          message:
            "This registered record comparison separates Before/After display states into tabs. Review use of the shared visible Git-style diff.",
          evidence: values,
        }),
      ];
    }
    return [
      finding(source, element, {
        rule: "C6",
        check: "sequential-narrative-tabs",
        severity: "advisory",
        message:
          "A registered ordered narrative renders Tabs without a connected stage presentation. Review whether every required step can remain visible.",
        evidence: [target.purpose, ...values],
      }),
    ];
  });
  if (["ordered-workflow", "connected-pattern"].includes(target.role)) {
    for (const list of lists) {
      const context = ts.isJsxElement(list.parent) ? list.parent : list;
      if (hasConnector(context)) continue;
      const rows = mappedRows(list);
      if (
        !rows.some(({ row }) =>
          elements(row).some((element) =>
            ["h2", "h3", "p"].includes(tag(element)),
          ),
        )
      )
        continue;
      findings.push(
        finding(source, list, {
          rule: "C6",
          check: "disconnected-workflow-list",
          severity: "advisory",
          message:
            "A registered workflow maps local numbered/prose rows without a visible connector in the list composition. Review reuse of ConnectedJourney or the approved roadmap family.",
          evidence: [
            target.purpose,
            ...rows.map(
              ({ row }) => `Mapped <li> at line ${location(source, row).line}.`,
            ),
          ],
        }),
      );
    }
  }
  return { findings, coverage };
};

/** A glyph string counts as a ramp only when code actually indexes that declaration. */
export const checkGlyphRamps = (
  source: Source,
  renderer: Renderer,
): Finding[] => {
  if (renderer.kind === "protocol-text") return [];
  const selected = scopes(source, renderer);
  const access = selected.flatMap((scope) =>
    descendants(scope, ts.isElementAccessExpression),
  );
  return descendants(source.tree, ts.isVariableDeclaration).flatMap(
    (declaration) => {
      if (!declaration.initializer || !ts.isIdentifier(declaration.name))
        return [];
      const initializer = unwrap(declaration.initializer);
      if (!ts.isStringLiteralLike(initializer) || initializer.text.length > 64)
        return [];
      const characters = [...new Set(initializer.text.trim())];
      if (
        characters.length < 3 ||
        !characters.every((character) =>
          " -=+xX%#@/\\|.·•∙●○◦∘⦁".includes(character),
        ) ||
        characters.every((character) => " .·•∙●○◦∘⦁".includes(character))
      )
        return [];
      if (
        !access.some(
          (expression) =>
            expression.expression.getText() === declaration.name.getText(),
        )
      )
        return [];
      return [
        finding(source, declaration.initializer, {
          rule: "C4",
          check: "legacy-glyph-ramp",
          severity: "warning",
          message:
            "This artwork still indexes a mixed-character density ramp. The approved tonal-dot rule includes meaningful paths; retain the path and its markers while replacing this renderer.",
          evidence: [
            `${renderer.subject}; ${declaration.name.getText()} = ${JSON.stringify(initializer.text)}.`,
            "Actual code, protocol trees and data strings are outside the artwork contract.",
          ],
        }),
      ];
    },
  );
};

export const artworkBindings = (source: Source, prefix: string) =>
  literals(source.tree).flatMap((literal) =>
    [...literal.text.matchAll(/\/images\/ascii\/[^\s'"()`,;]+/g)]
      .filter((match) => match[0].startsWith(prefix))
      .map((match) => ({ asset: match[0], node: literal })),
  );

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) => (typeof value === "string" ? value : "");
const publicAsset = (value: string) =>
  value.startsWith("apps/web/public/")
    ? value.slice("apps/web/public".length)
    : value;

/** Normalize the three checked-in provenance formats without duplicating source manifests. */
export const readProvenance = (file: string, input: unknown): Provenance[] => {
  const document = object(input);
  const { subjects, asset, method, wordmark: wordmarkValue } = document;
  const records = Array.isArray(subjects)
    ? subjects.map(object)
    : asset
      ? [document]
      : [];
  const entries = records.flatMap((record) => {
    const {
      subject,
      text,
      method: recordMethod,
      source,
      sourceSha256,
      asset: recordAsset,
      assetSha256,
      mobileAsset,
    } = record;
    const base = {
      file,
      subject: string(subject) || string(text),
      method: string(recordMethod) || string(method),
      source: string(source),
      sourceSha256: string(sourceSha256) || undefined,
    };
    return [
      {
        ...base,
        asset: publicAsset(string(recordAsset)),
        assetSha256: string(assetSha256) || undefined,
      },
      ...(mobileAsset
        ? [{ ...base, asset: publicAsset(string(mobileAsset)) }]
        : []),
    ];
  });
  const {
    assets,
    method: wordmarkMethod,
    source,
    sourceSha256,
  } = object(wordmarkValue);
  return [
    ...entries,
    ...(Array.isArray(assets)
      ? assets.map((asset) => ({
          file,
          subject: "ecentic wordmark",
          method: string(wordmarkMethod),
          source: string(source),
          sourceSha256: string(sourceSha256) || undefined,
          asset: publicAsset(string(asset)),
        }))
      : []),
  ];
};

export const assetFile = (path: string) =>
  path.startsWith("/") ? `apps/web/public${path}` : path;
export const sha256 = (content: Uint8Array) =>
  createHash("sha256").update(content).digest("hex");

/** Optimized masks encode each circle as two relative semicircular arcs. */
const circlePath = (element: Element) => {
  const value = attribute(element, "d")?.initializer;
  if (!value || !ts.isStringLiteral(value)) return false;
  const parts =
    value.text.match(
      /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,
    ) ?? [];
  if (
    !parts.length ||
    parts.length % 19 !== 0 ||
    value.text
      .replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g, "")
      .replace(/[\s,]/g, "")
  )
    return false;
  return Array.from({ length: parts.length / 19 }, (_, index) =>
    parts.slice(index * 19, (index + 1) * 19),
  ).every((part) => {
    if (part[0] !== "M" || part[3] !== "a" || part[11] !== "a") return false;
    const values = part.map(Number);
    const radius = values[4] ?? 0;
    return (
      radius > 0 &&
      values[5] === radius &&
      values[12] === radius &&
      values[13] === radius &&
      values[6] === 0 &&
      values[14] === 0 &&
      values[7] === 1 &&
      values[15] === 1 &&
      [0, 1].includes(values[8] ?? -1) &&
      values[8] === values[16] &&
      values[10] === 0 &&
      values[18] === 0 &&
      Math.abs((values[9] ?? 0) - radius * 2) <= 0.021 &&
      values[17] === -(values[9] ?? 0)
    );
  });
};

export const checkAsset = (
  provenance: Provenance,
  files: ReadonlyMap<string, Uint8Array>,
): Finding[] => {
  const source = assetFile(provenance.source);
  const asset = assetFile(provenance.asset);
  const messages = [
    ...(!provenance.subject || !provenance.source || !provenance.method
      ? ["The asset lacks a meaningful subject, source or rendering method."]
      : []),
    ...(!files.has(source) ? [`Source is missing: ${source}.`] : []),
    ...(!files.has(asset) ? [`Output is missing: ${asset}.`] : []),
    ...(source === asset
      ? [
          "The source and output are the same file; generated dot art is not clean source provenance.",
        ]
      : []),
    ...(!provenance.sourceSha256
      ? ["Source provenance has no SHA-256 digest."]
      : []),
    ...(
      [
        [source, provenance.sourceSha256],
        [asset, provenance.assetSha256],
      ] as const
    ).flatMap(([path, expected]) => {
      const content = files.get(path);
      return expected && content && sha256(content) !== expected
        ? [`SHA-256 differs from provenance for ${path}.`]
        : [];
    }),
  ];
  const output = files.get(asset);
  if (output && asset.endsWith(".svg")) {
    const svg = parseSource(asset, new TextDecoder().decode(output));
    const shapes = elements(svg.tree);
    const circles = shapes.some(
      (element) =>
        tag(element) === "circle" ||
        (tag(element) === "path" && circlePath(element)),
    );
    const unsupported = shapes.some(
      (element) =>
        [
          "text",
          "image",
          "foreignObject",
          "rect",
          "polygon",
          "polyline",
          "line",
          "ellipse",
        ].includes(tag(element)) ||
        (tag(element) === "path" && !circlePath(element)),
    );
    if (!circles || unsupported)
      messages.push(
        "Expected a circle-based tonal SVG; found non-dot geometry or embedded text/raster content.",
      );
  }
  return messages.map((message) => ({
    rule: "C4",
    check: "artwork-provenance",
    severity: "warning",
    file: provenance.file,
    line: 1,
    column: 1,
    message,
    evidence: [
      `${provenance.subject}: ${provenance.source} → ${provenance.asset}`,
    ],
  }));
};

/** Import edges are file reachability, not proof that a runtime route renders every export. */
export const consumerGraph = (sources: readonly Source[]) => {
  const available = new Set(sources.map((source) => source.file));
  const graph = new Map<string, Set<string>>();
  for (const source of sources) {
    for (const statement of source.tree.statements) {
      if (
        (!ts.isImportDeclaration(statement) &&
          !ts.isExportDeclaration(statement)) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue;
      if (
        ts.isImportDeclaration(statement) &&
        (statement.importClause?.isTypeOnly ||
          (statement.importClause?.namedBindings &&
            ts.isNamedImports(statement.importClause.namedBindings) &&
            !statement.importClause.name &&
            statement.importClause.namedBindings.elements.every(
              (specifier) => specifier.isTypeOnly,
            )))
      )
        continue;
      if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
      const module = statement.moduleSpecifier.text;
      const base = module.startsWith("@/")
        ? `apps/web/src/${module.slice(2)}`
        : module.startsWith(".")
          ? posix.normalize(posix.join(dirname(source.file), module))
          : undefined;
      if (!base) continue;
      const dependency = [
        base,
        `${base}.tsx`,
        `${base}.ts`,
        `${base}/index.tsx`,
        `${base}/index.ts`,
      ].find((path) => available.has(path));
      if (!dependency) continue;
      const consumers = graph.get(dependency) ?? new Set<string>();
      consumers.add(source.file);
      graph.set(dependency, consumers);
    }
  }
  return graph;
};

export const consumersOf = (
  file: string,
  graph: ReadonlyMap<string, ReadonlySet<string>>,
): string[] => {
  const visited = new Set([file]);
  const visit = (current: string) => {
    for (const consumer of graph.get(current) ?? []) {
      if (visited.has(consumer)) continue;
      visited.add(consumer);
      visit(consumer);
    }
  };
  visit(file);
  return [...visited].filter((path) => path !== file).sort();
};

export const syntaxFindings = (sources: readonly Source[]): Finding[] => {
  const indexed = new Map(sources.map((source) => [source.file, source.tree]));
  const program = ts.createProgram(
    [...indexed.keys()],
    { noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve },
    {
      getSourceFile: (file) => indexed.get(file),
      getDefaultLibFileName: () => "",
      writeFile: () => undefined,
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: (file) => indexed.has(file),
      readFile: (file) => indexed.get(file)?.text,
      getCanonicalFileName: (file) => file,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
    },
  );
  return program.getSyntacticDiagnostics().map((diagnostic) => {
    const position = diagnostic.file?.getLineAndCharacterOfPosition(
      diagnostic.start ?? 0,
    );
    return {
      rule: "syntax",
      check: "typescript-parser",
      severity: "error",
      file: diagnostic.file?.fileName ?? "unknown",
      line: (position?.line ?? 0) + 1,
      column: (position?.character ?? 0) + 1,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      evidence: [`TypeScript diagnostic ${diagnostic.code}.`],
    };
  });
};

export const sourceInScope = (file: string, registry: Registry) =>
  registry.publicRoots.some((root) => file.startsWith(root)) &&
  !registry.exclude.some((root) => file.startsWith(root));

export const analyzeSources = (
  sources: readonly Source[],
  registry: Registry,
) => {
  const indexed = new Map(sources.map((source) => [source.file, source]));
  const graph = consumerGraph(sources);
  const findings = [...syntaxFindings(sources)];
  const coverage: Coverage[] = [];
  const requireSource = (file: string) => {
    const source = indexed.get(file);
    if (!source)
      findings.push({
        rule: "registry",
        check: "source-file-missing",
        severity: "error",
        file,
        line: 1,
        column: 1,
        message:
          "A registered source file was not found. The scan is incomplete.",
        evidence: [],
      });
    return source;
  };
  for (const file of registry.seams) {
    const source = requireSource(file);
    coverage.push({
      id: `seams:${file}`,
      file,
      role: "structural-row",
      matched: !!source,
      observed: source
        ? elements(source.tree).filter((element) => tag(element) === "li")
            .length
        : 0,
      notes: [
        "Mapped li terminal selectors only; runtime geometry verifies actual seam ownership.",
      ],
    });
    if (source) findings.push(...checkSeams(source));
  }
  for (const target of registry.processes) {
    const source = requireSource(target.file);
    if (!source) continue;
    const result = checkPatterns(source, target);
    coverage.push(result.coverage);
    findings.push(...result.findings);
  }
  for (const contract of registry.visualContracts ?? []) {
    const source = requireSource(contract.file);
    if (!source) continue;
    const result = checkVisualContracts(source, contract);
    coverage.push(result.coverage);
    findings.push(...result.findings);
  }
  const bindings = sources
    .filter((source) => sourceInScope(source.file, registry))
    .flatMap((source) =>
      artworkBindings(source, registry.artwork.assetPrefix).map((binding) => ({
        ...binding,
        source,
      })),
    );
  for (const renderer of registry.artwork.renderers) {
    const source = requireSource(renderer.file);
    if (!source) continue;
    const selected = scopes(source, renderer);
    coverage.push({
      id: renderer.id,
      file: source.file,
      role: renderer.kind,
      matched: selected.length > 0,
      observed: bindings.filter(
        (binding) => binding.source.file === source.file,
      ).length,
      notes: [
        renderer.subject,
        ...(renderer.source ? [renderer.source.description] : []),
        "Source checks do not establish visual recognizability, proportion or motion quality.",
      ],
    });
    if (!selected.length)
      findings.push(
        finding(source, source.tree, {
          rule: "registry",
          check: "renderer-missing",
          severity: "error",
          message: `Registered renderer ${renderer.id} was not found.`,
          evidence: [],
        }),
      );
    findings.push(...checkGlyphRamps(source, renderer));
    if (renderer.source) {
      const origin = requireSource(renderer.source.file);
      if (
        origin &&
        !descendants(origin.tree, ts.isVariableDeclaration).some(
          (declaration) =>
            declaration.name.getText() === renderer.source?.symbol,
        )
      )
        findings.push(
          finding(origin, origin.tree, {
            rule: "C4",
            check: "procedural-source-missing",
            severity: "warning",
            message:
              "Registered procedural artwork source symbol was not found; update its provenance when the renderer changes.",
            evidence: [renderer.source.symbol],
          }),
        );
    }
  }
  const registered = new Set(
    registry.artwork.renderers.map((renderer) => renderer.file),
  );
  for (const binding of bindings) {
    if (registered.has(binding.source.file)) continue;
    findings.push(
      finding(binding.source, binding.node, {
        rule: "C4",
        check: "unregistered-artwork-binding",
        severity: "advisory",
        message:
          "A public artwork asset is used outside the renderer registry. Register its subject and source/rendering contract for coverage.",
        evidence: [binding.asset],
      }),
    );
  }
  for (const legacy of registry.artwork.legacySources ?? []) {
    const source = requireSource(legacy.file);
    if (!source) continue;
    const consumers = consumersOf(legacy.file, graph).filter((file) =>
      sourceInScope(file, registry),
    );
    const art = literals(source.tree).find(
      (literal) =>
        literal.text.length > 200 &&
        literal.text.includes("\n") &&
        [...new Set(literal.text)].every((character) =>
          " \n\r-=+xX%#@/\\|._:;*!oO0123456789".includes(character),
        ),
    );
    coverage.push({
      id: `legacy:${legacy.file}`,
      file: legacy.file,
      role: "retired-image-text",
      matched: true,
      observed: consumers.length,
      notes: [
        legacy.subject,
        "Retained source history is allowed; importing it into a public renderer reactivates the old binding.",
      ],
    });
    if (art && consumers.length)
      findings.push(
        finding(source, art, {
          rule: "C4",
          check: "legacy-artwork-text-binding",
          severity: "warning",
          message:
            "Retired image-derived character art is reachable through current public value imports. Use the approved tonal renderer while retaining the meaningful subject.",
          evidence: [legacy.subject, ...consumers],
        }),
      );
  }
  return {
    findings: findings.map((item) => ({
      ...item,
      consumerFiles: consumersOf(item.file, graph),
    })),
    coverage,
    bindings,
    graph,
  };
};
