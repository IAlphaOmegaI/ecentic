import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as TypeScript from "typescript";

type Origin =
  | "factory"
  | "repository"
  | "delegate"
  | "guard"
  | "appender"
  | "protected"
  | "unknown";
type Exposure = {
  node: TypeScript.Node;
  name: string;
  symbol?: TypeScript.Symbol;
  expression?: TypeScript.Expression;
};

// Parse source only: the host never loads libraries, executes modules, or reads
// credentials. Symbols let aliases preserve their origin without a CRUD-name list.
const inspect = (texts: Map<string, string>, roots: string[]) => {
  const sources = new Map(
    [...texts].map(([path, text]) => [
      path,
      TypeScript.createSourceFile(
        path,
        text,
        TypeScript.ScriptTarget.Latest,
        true,
      ),
    ]),
  );
  const options = { noLib: true, noEmit: true, types: [] };
  const program = TypeScript.createProgram([...sources.keys()], options, {
    ...TypeScript.createCompilerHost(options),
    getSourceFile: (path) => sources.get(path),
    fileExists: (path) => sources.has(path),
    readFile: (path) => texts.get(path),
    writeFile: () => {},
    resolveModuleNames: (names, containing) =>
      names.map((name) => {
        const root = roots.find((root) => containing.startsWith(`${root}/`));
        const base = name.startsWith("@/")
          ? root && resolve(root, "..", name.slice(2))
          : name.startsWith(".") && resolve(dirname(containing), name);
        if (!base) return undefined;
        const path = [
          base,
          `${base}.ts`,
          `${base}.tsx`,
          join(base, "index.ts"),
        ].find((path) => sources.has(path));
        return path ? { resolvedFileName: path } : undefined;
      }),
  });
  const checker = program.getTypeChecker();
  const canonical = (symbol: TypeScript.Symbol): TypeScript.Symbol =>
    symbol.flags & TypeScript.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const reference = (root: string, module: string, name: string) => {
    const source = sources.get(join(root, "utils", `${module}.ts`));
    const symbol = source && checker.getSymbolAtLocation(source);
    return (
      symbol &&
      checker.getExportsOfModule(symbol).find((entry) => entry.name === name)
    );
  };
  const trusted = new Map<TypeScript.Symbol, Origin>(
    roots.flatMap((root) =>
      (
        [
          ["repository", "repository", "factory"],
          ["authentication", "withAuthentication", "guard"],
          ["authorization", "withAuthorization", "guard"],
          ["entitlement", "withSubscription", "guard"],
        ] as const
      ).flatMap(([module, name, origin]) => {
        const member = reference(root, module, name);
        return member ? [[canonical(member), origin] as const] : [];
      }),
    ),
  );
  const forwarded = (expression: TypeScript.Expression | undefined) => {
    if (
      !expression ||
      !TypeScript.isArrowFunction(expression) ||
      !expression.modifiers?.some(
        (modifier) => modifier.kind === TypeScript.SyntaxKind.AsyncKeyword,
      ) ||
      expression.parameters.length !== 1 ||
      !TypeScript.isCallExpression(expression.body)
    )
      return undefined;
    const parameter = expression.parameters[0];
    const argument = expression.body.arguments[0];
    if (
      !parameter?.dotDotDotToken ||
      !TypeScript.isIdentifier(parameter.name) ||
      expression.body.arguments.length !== 1 ||
      !argument ||
      !TypeScript.isSpreadElement(argument) ||
      checker.getSymbolAtLocation(argument.expression) !==
        checker.getSymbolAtLocation(parameter.name)
    )
      return undefined;
    return expression.body.expression;
  };
  const symbolOrigin = (
    symbol: TypeScript.Symbol | undefined,
    seen: ReadonlySet<TypeScript.Symbol> = new Set(),
  ): Origin => {
    if (!symbol) return "unknown";
    const target = canonical(symbol);
    const known = trusted.get(target);
    if (known) return known;
    if (seen.has(target)) return "unknown";
    const visited = new Set([...seen, target]);
    const declaration = target.valueDeclaration;
    if (!declaration) return "unknown";
    if (
      TypeScript.isVariableDeclaration(declaration) ||
      TypeScript.isPropertyAssignment(declaration) ||
      TypeScript.isExportAssignment(declaration)
    )
      return expressionOrigin(
        TypeScript.isExportAssignment(declaration)
          ? declaration.expression
          : declaration.initializer,
        visited,
      );
    if (TypeScript.isShorthandPropertyAssignment(declaration))
      return symbolOrigin(
        checker.getShorthandAssignmentValueSymbol(declaration),
        visited,
      );
    if (TypeScript.isBindingElement(declaration)) {
      const parent = declaration.parent.parent;
      if (!TypeScript.isVariableDeclaration(parent) || !parent.initializer)
        return "unknown";
      if (
        declaration.dotDotDotToken &&
        expressionOrigin(parent.initializer, visited) === "repository"
      )
        return "repository";
      const property = declaration.propertyName ?? declaration.name;
      if (
        TypeScript.isIdentifier(property) ||
        TypeScript.isStringLiteral(property)
      )
        return propertyOrigin(parent.initializer, property.text, visited);
    }
    return "unknown";
  };
  const propertyOrigin = (
    expression: TypeScript.Expression,
    name: string,
    seen: ReadonlySet<TypeScript.Symbol>,
  ): Origin => {
    if (
      TypeScript.isParenthesizedExpression(expression) ||
      TypeScript.isAsExpression(expression) ||
      TypeScript.isSatisfiesExpression(expression) ||
      TypeScript.isNonNullExpression(expression)
    )
      return propertyOrigin(expression.expression, name, seen);
    const origin = expressionOrigin(expression, seen);
    if (origin === "repository") return "delegate";
    if (origin === "guard" && name === "append") return "appender";
    if (TypeScript.isObjectLiteralExpression(expression)) {
      // A later explicit member/spread wins, just as it does at runtime.
      const member = [...expression.properties].reverse().find((property) => {
        if (TypeScript.isSpreadAssignment(property)) {
          const type = checker.getTypeAtLocation(property.expression);
          return (
            expressionOrigin(property.expression, seen) === "repository" ||
            Boolean(type.getProperty(name)) ||
            Boolean(
              type.flags &
                (TypeScript.TypeFlags.Any | TypeScript.TypeFlags.Unknown),
            )
          );
        }
        return (
          property.name &&
          (TypeScript.isIdentifier(property.name) ||
            TypeScript.isStringLiteral(property.name)) &&
          property.name.text === name
        );
      });
      if (member && TypeScript.isSpreadAssignment(member))
        return propertyOrigin(member.expression, name, seen);
      if (member && TypeScript.isPropertyAssignment(member))
        return expressionOrigin(member.initializer, seen);
      if (member && TypeScript.isShorthandPropertyAssignment(member))
        return symbolOrigin(
          checker.getShorthandAssignmentValueSymbol(member),
          seen,
        );
      return "unknown";
    }
    const symbol = checker.getSymbolAtLocation(expression);
    const target = symbol && canonical(symbol);
    const declaration = target?.valueDeclaration;
    if (
      target &&
      !seen.has(target) &&
      declaration &&
      (TypeScript.isVariableDeclaration(declaration) ||
        TypeScript.isPropertyAssignment(declaration)) &&
      declaration.initializer
    )
      return propertyOrigin(
        declaration.initializer,
        name,
        new Set([...seen, target]),
      );
    return symbolOrigin(
      checker.getTypeAtLocation(expression).getProperty(name),
      seen,
    );
  };
  const expressionOrigin = (
    expression: TypeScript.Expression | undefined,
    seen: ReadonlySet<TypeScript.Symbol>,
  ): Origin => {
    if (!expression) return "unknown";
    if (
      TypeScript.isParenthesizedExpression(expression) ||
      TypeScript.isAsExpression(expression) ||
      TypeScript.isSatisfiesExpression(expression) ||
      TypeScript.isNonNullExpression(expression)
    )
      return expressionOrigin(expression.expression, seen);
    if (TypeScript.isCallExpression(expression)) {
      const origin = expressionOrigin(expression.expression, seen);
      if (origin === "factory") return "repository";
      if (origin === "guard") return "protected";
      if (origin === "appender") return "guard";
      return "unknown";
    }
    if (TypeScript.isArrowFunction(expression)) {
      const target = forwarded(expression);
      return target ? expressionOrigin(target, seen) : "unknown";
    }
    if (
      TypeScript.isPropertyAccessExpression(expression) ||
      TypeScript.isElementAccessExpression(expression)
    ) {
      if (expressionOrigin(expression.expression, seen) === "repository")
        return "delegate";
      if (TypeScript.isPropertyAccessExpression(expression))
        return propertyOrigin(
          expression.expression,
          expression.name.text,
          seen,
        );
      if (TypeScript.isStringLiteral(expression.argumentExpression))
        return propertyOrigin(
          expression.expression,
          expression.argumentExpression.text,
          seen,
        );
    }
    return symbolOrigin(checker.getSymbolAtLocation(expression), seen);
  };
  const bindings = (name: TypeScript.BindingName): TypeScript.Identifier[] =>
    TypeScript.isIdentifier(name)
      ? [name]
      : name.elements.flatMap((element) =>
          TypeScript.isBindingElement(element) ? bindings(element.name) : [],
        );
  const exports = (
    source: TypeScript.SourceFile,
    seen: ReadonlySet<TypeScript.SourceFile> = new Set(),
  ): Exposure[] => {
    if (seen.has(source)) return [];
    const visited = new Set([...seen, source]);
    return source.statements.flatMap((statement): Exposure[] => {
      if (TypeScript.isExportDeclaration(statement)) {
        if (statement.isTypeOnly) return [];
        if (
          statement.exportClause &&
          TypeScript.isNamedExports(statement.exportClause)
        )
          return statement.exportClause.elements
            .filter((element) => !element.isTypeOnly)
            .map((element) => ({
              node: element,
              name: element.name.text,
              symbol: checker.getSymbolAtLocation(element.name),
            }));
        const symbol =
          statement.moduleSpecifier &&
          checker.getSymbolAtLocation(statement.moduleSpecifier);
        const target = symbol?.declarations?.find(TypeScript.isSourceFile);
        const module = checker.getSymbolAtLocation(source);
        const effective = module ? checker.getExportsOfModule(module) : [];
        if (!target) return [];
        return exports(target, visited)
          .filter(
            ({ name, symbol }) =>
              name !== "default" &&
              symbol &&
              effective.some(
                (member) =>
                  member.name === name &&
                  canonical(member) === canonical(symbol),
              ),
          )
          .map((entry) => ({ ...entry, node: statement }));
      }
      if (TypeScript.isExportAssignment(statement))
        return [
          {
            node: statement,
            name: "default",
            expression: statement.expression,
          },
        ];
      if (
        !TypeScript.canHaveModifiers(statement) ||
        !TypeScript.getModifiers(statement)?.some(
          (modifier) => modifier.kind === TypeScript.SyntaxKind.ExportKeyword,
        )
      )
        return [];
      if (TypeScript.isVariableStatement(statement))
        return statement.declarationList.declarations.flatMap((declaration) =>
          bindings(declaration.name).map((name) => ({
            node: name,
            name: name.text,
            symbol: checker.getSymbolAtLocation(name),
          })),
        );
      if (TypeScript.isFunctionDeclaration(statement) && statement.name)
        return [
          {
            node: statement,
            name: statement.name.text,
            symbol: checker.getSymbolAtLocation(statement.name),
          },
        ];
      return [];
    });
  };
  const isServer = (source: TypeScript.SourceFile) => {
    const end = source.statements.findIndex(
      (statement) =>
        !TypeScript.isExpressionStatement(statement) ||
        !TypeScript.isStringLiteral(statement.expression),
    );
    return source.statements
      .slice(0, end < 0 ? undefined : end)
      .some(
        (statement) =>
          TypeScript.isExpressionStatement(statement) &&
          TypeScript.isStringLiteral(statement.expression) &&
          statement.expression.text === "use server",
      );
  };
  const facades = [...sources.values()].filter((source) =>
    source.fileName.endsWith(".actions.ts"),
  );
  const actions = [...sources.values()].filter(isServer);
  const violations = [...new Set([...actions, ...facades])].flatMap(
    (source) => {
      const facade = facades.includes(source);
      const report = (node: TypeScript.Node, message: string) =>
        `${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${message}`;
      const shape = facade
        ? source.statements.flatMap((statement) => {
            if (TypeScript.isExportDeclaration(statement)) {
              if (
                statement.isTypeOnly ||
                (statement.exportClause &&
                  TypeScript.isNamedExports(statement.exportClause) &&
                  statement.exportClause.elements.every(
                    (element) => element.isTypeOnly,
                  ))
              )
                return [];
              return [
                report(
                  statement,
                  "facades require explicit async rest-argument forwarders",
                ),
              ];
            }
            if (
              TypeScript.isVariableStatement(statement) &&
              TypeScript.getModifiers(statement)?.some(
                (modifier) =>
                  modifier.kind === TypeScript.SyntaxKind.ExportKeyword,
              )
            )
              return statement.declarationList.declarations.flatMap(
                (declaration) =>
                  TypeScript.isIdentifier(declaration.name) &&
                  forwarded(declaration.initializer)
                    ? []
                    : [
                        report(
                          declaration,
                          "facades require explicit async rest-argument forwarders",
                        ),
                      ],
              );
            if (
              TypeScript.isExportAssignment(statement) ||
              (TypeScript.canHaveModifiers(statement) &&
                TypeScript.getModifiers(statement)?.some(
                  (modifier) =>
                    modifier.kind === TypeScript.SyntaxKind.ExportKeyword,
                ) &&
                !TypeScript.isTypeAliasDeclaration(statement) &&
                !TypeScript.isInterfaceDeclaration(statement))
            )
              return [
                report(
                  statement,
                  "facades require explicit async rest-argument forwarders",
                ),
              ];
            return [];
          })
        : [];
      return [
        ...(!isServer(source) && facade
          ? [report(source, "action facade must declare use server")]
          : []),
        ...shape,
        ...exports(source).flatMap(({ node, name, symbol, expression }) => {
          if (
            symbol &&
            !(canonical(symbol).flags & TypeScript.SymbolFlags.Value)
          )
            return [];
          const origin = expression
            ? expressionOrigin(expression, new Set())
            : symbolOrigin(symbol);
          if (
            origin === "delegate" ||
            origin === "repository" ||
            origin === "factory"
          )
            return [report(node, `${name} exposes an unguarded repository`)];
          if (facade && origin !== "protected")
            return [
              report(
                node,
                `${name} must originate from an authentication, authorization, or subscription wrapper`,
              ),
            ];
          return [];
        }),
      ];
    },
  );
  return {
    violations: [
      ...roots
        .filter((root) => !reference(root, "repository", "repository"))
        .map(
          (root) => `${root}: cannot resolve the canonical repository factory`,
        ),
      ...violations,
    ],
    actions: actions.map(({ fileName }) => fileName),
    facades: facades.map(({ fileName }) => fileName),
  };
};

const ROOT = "/fixtures/web/src/server";
const fixture = (files: Record<string, string>) =>
  inspect(
    new Map(
      Object.entries({
        "utils/repository.ts":
          "export const repository = () => ({ get: async () => null, destroy: async () => null });",
        "utils/authentication.ts":
          "export const withAuthentication = (operation: unknown) => operation;",
        "utils/authorization.ts":
          "export const withAuthorization = (roles: unknown, operation: unknown) => operation;",
        "utils/entitlement.ts":
          "export const withSubscription = (operation: unknown) => operation;",
        "utils/context.ts":
          "export const withInstrumentation = (operation: unknown) => operation; export const withContext = withInstrumentation;",
        ...files,
      }).map(([path, text]) => [join(ROOT, path), text]),
    ),
    [ROOT],
  );

describe("server action export boundaries", () => {
  test.each([
    "export const { get: read } = factory();",
    "const model = factory(); const read = model.get; export { read };",
    "const model = factory(); export const read = model['get'];",
    "const Model = { ...factory() }; export const read = Model.get;",
    "const Model = { ...factory() }; export const { get: read } = Model;",
    "const Model = ({ ...factory() }); export const read = Model.get;",
    "const Model = { ...factory() } as Record<string, unknown>; export const read = Model.get;",
    "const Model = { ...factory() } satisfies Record<string, unknown>; export const read = Model.get;",
    "const Model = factory(); const operation = 'get'; export const read = Model[operation];",
    "export default factory().get;",
  ])("rejects direct repository exposure: %s", (body) => {
    const result = fixture({
      "app/unsafe.ts": `"use server"; import { repository as factory } from "../utils/repository"; ${body}`,
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("exposes an unguarded repository");
  });

  test.each([
    'export { read as load } from "./barrel";',
    'import { read as load } from "./barrel"; export { load };',
    'import * as Model from "./barrel"; export const load = Model.read;',
    'import * as Model from "./barrel"; const { read: load } = Model; export { load };',
    'import * as Model from "./barrel"; const Actions = { ...Model }; export const load = Actions.read;',
    'export * from "./barrel";',
  ])("follows imported and re-exported repository aliases: %s", (body) => {
    const result = fixture({
      "app/model.ts":
        'import { repository } from "../utils/repository"; export const { get } = repository();',
      "app/barrel.ts": 'export { get as read } from "./model";',
      "app/unsafe.ts": `"use server"; ${body}`,
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("exposes an unguarded repository");
  });

  test.each([
    ["authentication", "withAuthentication", "async () => Model.get()"],
    ["entitlement", "withSubscription", "async () => Model.get()"],
    [
      "authorization",
      "withAuthorization",
      "['staff'], async () => Model.get()",
    ],
  ])(
    "accepts canonical %s wrappers and erased type exports",
    (module, wrapper, arguments_) => {
      const result = fixture({
        "app/model.ts": `import { repository } from "../utils/repository"; import { ${wrapper} as guard } from "../utils/${module}"; const Model = repository(); export const read = guard(${arguments_}); export const { destroy } = Model; export type Type = string;`,
        "app/model.actions.ts":
          '"use strict"; "use server"; import * as Model from "./model"; export type * from "./model"; export { type Type } from "./model"; export const load = async (...parameters: unknown[]) => Model.read(...parameters);',
      });
      expect(result.violations).toEqual([]);
    },
  );

  test.each([
    'import { withInstrumentation as guard } from "../utils/context";',
    'import { withContext as guard } from "../utils/context";',
    "const withAuthentication = (operation: unknown) => operation; const guard = withAuthentication;",
  ])("rejects unprotected facade operations: %s", (guard) => {
    const result = fixture({
      "app/model.ts": `${guard} export const read = guard(async () => null);`,
      "app/model.actions.ts":
        '"use server"; import * as Model from "./model"; export const read = async (...parameters: unknown[]) => Model.read(...parameters);',
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("must originate from");
  });

  test.each([
    'export * from "./model";',
    'export { read } from "./model";',
    'import { read } from "./model"; export { read };',
    'import { read } from "./model"; export const load = read;',
  ])("requires explicit async facade forwarders: %s", (body) => {
    const result = fixture({
      "app/model.ts":
        'import { withAuthentication } from "../utils/authentication"; export const read = withAuthentication(async () => null);',
      "app/model.actions.ts": `"use server"; ${body}`,
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain(
      "explicit async rest-argument forwarders",
    );
  });

  test.each([
    "(...parameters: unknown[]) => Model.read(...parameters)",
    "async (parameters: unknown[]) => Model.read(...parameters)",
    "async (...parameters: unknown[]) => Model.read(parameters)",
    "async (...parameters: unknown[]) => Model.read(...parameters, 'extra')",
    "async (...parameters: unknown[]) => { sideEffect(); return Model.read(...parameters); }",
  ])("rejects malformed facade delegation: %s", (operation) => {
    const result = fixture({
      "app/model.ts":
        'import { withAuthentication } from "../utils/authentication"; export const read = withAuthentication(async () => null);',
      "app/model.actions.ts": `"use server"; import * as Model from "./model"; export const read = ${operation};`,
    });
    expect(
      result.violations.some((message) =>
        message.includes("explicit async rest-argument forwarders"),
      ),
    ).toBe(true);
  });

  test("rejects a well-formed facade forwarding to raw CRUD", () => {
    const result = fixture({
      "app/model.ts":
        'import { repository } from "../utils/repository"; export const { get } = repository();',
      "app/model.actions.ts":
        '"use server"; import * as Model from "./model"; export const read = async (...parameters: unknown[]) => Model.get(...parameters);',
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("exposes an unguarded repository");
  });

  test("accepts a canonical guard extended through append", () => {
    const result = fixture({
      "app/model.ts":
        'import { withAuthentication as guard } from "../utils/authentication"; export const read = guard.append(enhancer).append(another)(async () => null);',
      "app/model.actions.ts":
        '"use server"; import * as Model from "./model"; export const read = async (...parameters: unknown[]) => Model.read(...parameters);',
    });
    expect(result.violations).toEqual([]);
  });

  test("respects object spread override order", () => {
    const safe =
      'import { repository } from "../utils/repository"; import { withAuthentication } from "../utils/authentication"; const read = withAuthentication(async () => null);';
    expect(
      fixture({
        "app/actions.ts": `"use server"; ${safe} const Model = { ...repository(), get: read }; export const load = Model.get;`,
      }).violations,
    ).toEqual([]);
    expect(
      fixture({
        "app/actions.ts": `"use server"; ${safe} const Model = { get: read, ...repository() }; export const load = Model.get;`,
      }).violations,
    ).toHaveLength(1);
  });

  test("export star excludes defaults and respects explicit overrides", () => {
    const result = fixture({
      "app/model.ts":
        'import { repository } from "../utils/repository"; export const { get } = repository(); export default get;',
      "app/actions.ts":
        '"use server"; import { withAuthentication } from "../utils/authentication"; export * from "./model"; export const get = withAuthentication(async () => null);',
    });
    expect(result.violations).toEqual([]);
  });

  test("does not silently skip a missing canonical repository factory", () => {
    const result = fixture({ "utils/repository.ts": "export {};" });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("cannot resolve");
  });

  test("requires use server on an action facade", () => {
    const result = fixture({
      "app/model.ts":
        'import { withAuthentication } from "../utils/authentication"; export const read = withAuthentication(async () => null);',
      "app/model.actions.ts":
        'import * as Model from "./model"; export const read = async (...parameters: unknown[]) => Model.read(...parameters);',
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("must declare use server");
  });

  test("checks every web and outbound server module and action facade", () => {
    const workspace = resolve(import.meta.dir, "../../../../..");
    const roots = ["web", "outbound"].map((app) =>
      join(workspace, "apps", app, "src/server"),
    );
    const read = (directory: string): [string, string][] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === "spec" ? [] : read(path);
        return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")
          ? [[path, readFileSync(path, "utf8")]]
          : [];
      });
    const result = inspect(new Map(roots.flatMap(read)), roots);
    for (const root of roots)
      expect(result.actions.some((path) => path.startsWith(`${root}/`))).toBe(
        true,
      );
    expect(result.facades.length).toBeGreaterThan(0);
    expect(result.violations).toEqual([]);
  });
});
