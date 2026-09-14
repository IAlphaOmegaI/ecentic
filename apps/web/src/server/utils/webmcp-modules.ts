import { resultify } from "@zenncore/utils";
import { parse } from "acorn";
import { SCRIPT_LIMIT_BYTES } from "./webmcp-limits";

type Syntax = {
  type: string;
  name?: unknown;
  value?: unknown;
  computed?: unknown;
  operator?: unknown;
  kind?: unknown;
  [field: string]: unknown;
};
type Scope = {
  values: Map<string, Value>;
  parent?: Scope;
  functionScope?: boolean;
};
type Value =
  | { kind: "unknown" | "missing" | "script" }
  | { kind: "string"; value: string }
  | { kind: "browser"; name: string }
  | { kind: "object"; values: Map<string, Value>; complete: boolean }
  | { kind: "function"; node: Syntax; scope: Scope };

const unknown: Value = { kind: "unknown" };
const syntax = (value: unknown): value is Syntax =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";
const child = (node: Syntax, field: string) =>
  syntax(node[field]) ? node[field] : undefined;
const children = (node: Syntax, field: string): Syntax[] =>
  Array.isArray(node[field]) ? node[field].filter(syntax) : [];
const nested = (node: Syntax) =>
  Object.values(node).flatMap((value) =>
    syntax(value) ? [value] : Array.isArray(value) ? value.filter(syntax) : [],
  );
const nameOf = (node?: Syntax, computed = false): string | null => {
  if (!node) return null;
  if (!computed && node.type === "Identifier") return String(node.name);
  return node.type === "Literal" && typeof node.value === "string"
    ? node.value
    : null;
};
const lookup = (scope: Scope, name: string): Value => {
  if (scope.values.has(name)) return scope.values.get(name) ?? unknown;
  if (scope.parent) return lookup(scope.parent, name);
  return ["document", "window", "globalThis"].includes(name)
    ? { kind: "browser", name }
    : unknown;
};

/**
 * Discover executable resource references without executing the page. Imports
 * resolve against the module; created script.src URLs resolve against document
 * base. Small loader helpers can pass literal URLs through parameters, including
 * Shopify's conditional loader. Arbitrary strings, images and fetch URLs are
 * deliberately not treated as scripts.
 */
export const discoverModules = (
  source: string,
  sourceUrl: string,
  documentBase: string,
) => {
  const urls = new Set<string>();
  const budget = { remaining: 50_000, incomplete: false };
  if (Buffer.byteLength(source, "utf8") > SCRIPT_LIMIT_BYTES)
    return { urls: [], incomplete: true };
  const module = resultify(() =>
    parse(source, { ecmaVersion: "latest", sourceType: "module" }),
  );
  const parsed = module.success
    ? module
    : resultify(() =>
        parse(source, { ecmaVersion: "latest", sourceType: "script" }),
      );
  if (!parsed.success) return { urls: [], incomplete: true };
  const spend = (depth: number) => {
    budget.remaining -= 1;
    if (budget.remaining > 0 && depth <= 48) return true;
    budget.incomplete = true;
    return false;
  };
  const add = (value: Value, base: string, imported = false) => {
    if (value.kind !== "string") {
      budget.incomplete = true;
      return;
    }
    // Bare ESM specifiers require an import map; do not guess a network path.
    if (imported && !/^(?:\.{1,2}\/|\/|https?:\/\/)/i.test(value.value)) {
      budget.incomplete = true;
      return;
    }
    const url = resultify(() => new URL(value.value, base));
    if (
      !value.value ||
      !url.success ||
      !["http:", "https:"].includes(url.data.protocol)
    )
      return;
    if (url.data.username || url.data.password || url.data.href.length > 2048)
      return;
    url.data.hash = "";
    if (urls.size < 64) urls.add(url.data.href);
    else budget.incomplete = true;
  };

  const readValue = (
    node: Syntax | undefined,
    scope: Scope,
    depth = 0,
  ): Value => {
    if (!node || !spend(depth)) return unknown;
    const resolve = (value?: Syntax) => readValue(value, scope, depth + 1);
    switch (node.type) {
      case "Identifier":
        return lookup(scope, String(node.name));
      case "Literal":
        return typeof node.value === "string"
          ? { kind: "string", value: node.value }
          : unknown;
      case "TemplateLiteral": {
        if (children(node, "expressions").length) return unknown;
        const value = children(node, "quasis")[0]?.value;
        return typeof value === "object" &&
          value !== null &&
          "cooked" in value &&
          typeof value.cooked === "string"
          ? { kind: "string", value: value.cooked }
          : unknown;
      }
      case "ChainExpression":
        return resolve(child(node, "expression"));
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return { kind: "function", node, scope };
      case "ObjectExpression": {
        const properties = children(node, "properties");
        const object: Value & { kind: "object" } = {
          kind: "object",
          values: new Map(),
          complete: true,
        };
        for (const property of properties) {
          const name = nameOf(
            child(property, "key"),
            Boolean(property.computed),
          );
          if (property.type === "SpreadElement" || !name) {
            // Unknown properties may override existing browser options. A
            // later explicit property can still establish its own provenance.
            object.values.clear();
            object.complete = false;
            continue;
          }
          object.values.set(
            name,
            property.kind === "init"
              ? resolve(child(property, "value"))
              : unknown,
          );
        }
        return object;
      }
      case "MemberExpression": {
        const object = resolve(child(node, "object"));
        const name = nameOf(child(node, "property"), Boolean(node.computed));
        if (!name) return unknown;
        if (object.kind === "object")
          return (
            object.values.get(name) ??
            (object.complete ? { kind: "missing" } : unknown)
          );
        if (
          object.kind === "browser" &&
          ["window", "globalThis"].includes(object.name) &&
          name === "document"
        )
          return { kind: "browser", name };
        return unknown;
      }
      case "CallExpression": {
        const callee = child(node, "callee");
        if (callee?.type !== "MemberExpression") return unknown;
        const receiver = resolve(child(callee, "object"));
        const method = nameOf(
          child(callee, "property"),
          Boolean(callee.computed),
        );
        const argument = resolve(children(node, "arguments")[0]);
        if (
          receiver.kind === "unknown" &&
          method === "createElement" &&
          argument.kind === "string" &&
          argument.value.toLowerCase() === "script"
        )
          budget.incomplete = true;
        return receiver.kind === "browser" &&
          receiver.name === "document" &&
          method === "createElement" &&
          argument.kind === "string" &&
          argument.value.toLowerCase() === "script"
          ? { kind: "script" }
          : unknown;
      }
      default:
        return unknown;
    }
  };

  const bind = (
    pattern: Syntax | undefined,
    value: Value,
    scope: Scope,
    depth = 0,
  ): void => {
    if (!pattern || !spend(depth)) return;
    switch (pattern.type) {
      case "Identifier":
        scope.values.set(String(pattern.name), value);
        return;
      case "AssignmentPattern":
        bind(
          child(pattern, "left"),
          value.kind === "missing"
            ? readValue(child(pattern, "right"), scope)
            : value,
          scope,
          depth + 1,
        );
        return;
      case "ObjectPattern":
        for (const property of children(pattern, "properties")) {
          const name = nameOf(
            child(property, "key"),
            Boolean(property.computed),
          );
          bind(
            child(property, "value"),
            name && value.kind === "object"
              ? (value.values.get(name) ??
                  (value.complete ? { kind: "missing" } : unknown))
              : unknown,
            scope,
            depth + 1,
          );
        }
        return;
      case "ArrayPattern":
        for (const item of children(pattern, "elements"))
          bind(item, unknown, scope, depth + 1);
        return;
    }
  };

  const hoistVariables = (node: Syntax, scope: Scope, depth: number): void => {
    if (
      !spend(depth) ||
      [
        "FunctionDeclaration",
        "FunctionExpression",
        "ArrowFunctionExpression",
        "ClassDeclaration",
        "ClassExpression",
      ].includes(node.type)
    )
      return;
    if (node.type === "VariableDeclaration" && node.kind === "var") {
      for (const declaration of children(node, "declarations"))
        bind(child(declaration, "id"), unknown, scope);
      return;
    }
    for (const descendant of nested(node)) {
      if (budget.remaining <= 0) break;
      hoistVariables(descendant, scope, depth + 1);
    }
  };
  const variableScope = (scope: Scope): Scope =>
    scope.functionScope || !scope.parent ? scope : variableScope(scope.parent);
  const active = new Set<Syntax>();
  const visitFunction = (
    node: Syntax,
    parent: Scope,
    args: Value[],
    depth: number,
  ): void => {
    if (active.has(node) || !spend(depth)) return;
    active.add(node);
    const local: Scope = { values: new Map(), parent, functionScope: true };
    const body = child(node, "body");
    if (body) hoistVariables(body, local, depth + 1);
    const parameters = children(node, "params");
    for (const parameter of parameters) bind(parameter, unknown, local);
    parameters.forEach((parameter, index) => {
      bind(parameter, args[index] ?? { kind: "missing" }, local);
    });
    if (body) visit(body, local, depth + 1);
    active.delete(node);
  };
  const visit = (node: Syntax, scope: Scope, depth = 0): void => {
    if (!spend(depth)) return;
    switch (node.type) {
      case "Program":
      case "BlockStatement": {
        const local: Scope = {
          values: new Map(),
          parent: scope,
          functionScope: node.type === "Program",
        };
        const statements = children(node, "body");
        if (node.type === "Program") hoistVariables(node, local, depth + 1);
        for (const statement of statements) {
          if (statement.type === "FunctionDeclaration") {
            const identifier = child(statement, "id");
            if (identifier)
              local.values.set(String(identifier.name), {
                kind: "function",
                node: statement,
                scope: local,
              });
          }
          if (
            statement.type === "VariableDeclaration" &&
            statement.kind !== "var"
          )
            for (const declaration of children(statement, "declarations"))
              bind(child(declaration, "id"), unknown, local);
          if (statement.type === "ImportDeclaration")
            for (const specifier of children(statement, "specifiers"))
              bind(child(specifier, "local"), unknown, local);
          if (statement.type === "ClassDeclaration")
            bind(child(statement, "id"), unknown, local);
        }
        for (const statement of statements) {
          if (budget.remaining <= 0) break;
          visit(statement, local, depth + 1);
        }
        return;
      }
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        visitFunction(
          node,
          scope,
          children(node, "params").map(() => unknown),
          depth + 1,
        );
        return;
      case "CatchClause": {
        const local: Scope = { values: new Map(), parent: scope };
        bind(child(node, "param"), unknown, local);
        const body = child(node, "body");
        if (body) visit(body, local, depth + 1);
        return;
      }
      case "VariableDeclaration":
        for (const declaration of children(node, "declarations")) {
          const initial = child(declaration, "init");
          if (node.kind === "var" && !initial) continue;
          bind(
            child(declaration, "id"),
            readValue(initial, scope),
            node.kind === "var" ? variableScope(scope) : scope,
          );
          if (initial) visit(initial, scope, depth + 1);
        }
        return;
      case "ImportDeclaration":
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration": {
        const dependency = child(node, "source");
        if (dependency) add(readValue(dependency, scope), sourceUrl, true);
        break;
      }
      case "ImportExpression":
        add(readValue(child(node, "source"), scope), sourceUrl, true);
        break;
      case "AssignmentExpression": {
        const target = child(node, "left");
        if (
          target?.type === "MemberExpression" &&
          readValue(child(target, "object"), scope).kind === "script" &&
          nameOf(child(target, "property"), Boolean(target.computed)) === "src"
        )
          add(
            node.operator === "="
              ? readValue(child(node, "right"), scope)
              : unknown,
            documentBase,
          );
        if (target?.type === "MemberExpression") {
          const receiver = readValue(child(target, "object"), scope);
          if (receiver.kind === "object") {
            const property = nameOf(
              child(target, "property"),
              Boolean(target.computed),
            );
            if (property) receiver.values.set(property, unknown);
            else {
              receiver.values.clear();
              receiver.complete = false;
            }
          }
        }
        if (target?.type === "Identifier") {
          const name = String(target.name);
          const assign = (owner: Scope): void => {
            if (owner.values.has(name) || !owner.parent) {
              owner.values.set(
                name,
                node.operator === "="
                  ? readValue(child(node, "right"), scope)
                  : unknown,
              );
              return;
            }
            assign(owner.parent);
          };
          assign(scope);
        }
        break;
      }
      case "CallExpression": {
        const callee = child(node, "callee");
        const callable = readValue(callee, scope);
        const argumentsList = children(node, "arguments");
        if (callable.kind === "function") {
          visitFunction(
            callable.node,
            callable.scope,
            argumentsList.map((argument) => readValue(argument, scope)),
            depth + 1,
          );
          for (const argument of argumentsList)
            visit(argument, scope, depth + 1);
          return;
        }
        if (
          callee?.type === "MemberExpression" &&
          readValue(child(callee, "object"), scope).kind === "script" &&
          nameOf(child(callee, "property"), Boolean(callee.computed)) ===
            "setAttribute"
        ) {
          const attribute = readValue(argumentsList[0], scope);
          if (attribute.kind === "string" && attribute.value === "src")
            add(readValue(argumentsList[1], scope), documentBase);
        }
        break;
      }
    }
    for (const descendant of nested(node)) {
      if (budget.remaining <= 0) break;
      visit(descendant, scope, depth + 1);
    }
  };
  const inspected = resultify(() =>
    visit(parsed.data as unknown as Syntax, { values: new Map() }),
  );
  return {
    urls: [...urls],
    incomplete: !inspected.success || budget.incomplete,
  };
};
