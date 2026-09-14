import { resultify } from "@zenncore/utils";
import { parse as parseJavaScript } from "acorn";
import { type DefaultTreeAdapterMap, parse as parseHtml } from "parse5";
import type { FormEvidence, Signal, Tool } from "@/lib/webmcp";
import {
  HTML_LIMIT_BYTES,
  SCRIPT_LIMIT_BYTES,
} from "@/server/utils/webmcp-limits";

const FINDING_LIMIT = 100;
const NODE_LIMIT = 50_000;
const TEXT_LIMIT = 1_000;
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

type Syntax = {
  type: string;
  name?: string;
  value?: unknown;
  operator?: string;
  computed?: boolean;
  async?: boolean;
  generator?: boolean;
  start?: number;
  kind?: string;
  elements?: unknown[];
  [field: string]: unknown;
};
type Budget = { remaining: number; exhausted: boolean };
type Value =
  | { kind: "unknown" }
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "global"; name: string }
  | { kind: "context" }
  | { kind: "function"; node: Syntax; scope: Scope }
  | { kind: "object"; properties: Map<string, Value>; complete: boolean }
  | { kind: "array"; elements: Value[]; truncated: boolean };
type Scope = {
  bindings: Map<string, Value>;
  parent?: Scope;
  functionScope?: boolean;
};
type Element = DefaultTreeAdapterMap["element"];
type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlCache = {
  parents: WeakMap<Element, Element[]>;
  legends: WeakMap<Element, HtmlNode | null>;
};

const unknown: Value = { kind: "unknown" };
const syntax = (value: unknown): value is Syntax =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";
const child = (node: Syntax, key: string) =>
  syntax(node[key]) ? node[key] : undefined;
const children = (node: Syntax, key: string): Syntax[] =>
  Array.isArray(node[key]) ? node[key].filter(syntax) : [];
const nested = (node: Syntax): Syntax[] =>
  Object.values(node).flatMap((value) =>
    syntax(value) ? [value] : Array.isArray(value) ? value.filter(syntax) : [],
  );

const lookup = (scope: Scope, name: string): Value => {
  if (scope.bindings.has(name)) return scope.bindings.get(name) ?? unknown;
  if (scope.parent) return lookup(scope.parent, name);
  if (
    ["document", "navigator", "window", "globalThis", "Object"].includes(name)
  )
    return { kind: "global", name };
  return unknown;
};

const propertyName = (node?: Syntax, computed = false): string | null => {
  if (!node) return null;
  if (!computed && node.type === "Identifier") return String(node.name);
  if (node.type === "Literal" && typeof node.value === "string")
    return node.value;
  if (node.type === "Literal" && typeof node.value === "number")
    return String(node.value);
  return null;
};

/** Abstract interpretation only: functions, getters and property access never run. */
const abstractValue = (
  node: Syntax | undefined,
  scope: Scope,
  budget: Budget,
  depth = 0,
): Value => {
  if (!node) return unknown;
  if (depth > 48 || budget.remaining <= 0) {
    budget.exhausted = true;
    return unknown;
  }
  budget.remaining -= 1;
  const resolve = (value?: Syntax) =>
    abstractValue(value, scope, budget, depth + 1);
  switch (node.type) {
    case "Identifier":
      return lookup(scope, String(node.name));
    case "Literal":
      return node.value === null ||
        ["string", "number", "boolean"].includes(typeof node.value)
        ? {
            kind: "literal",
            value: node.value as string | number | boolean | null,
          }
        : unknown;
    case "TemplateLiteral": {
      if (children(node, "expressions").length) return unknown;
      const template = children(node, "quasis")[0]?.value;
      if (
        typeof template !== "object" ||
        template === null ||
        !("cooked" in template) ||
        typeof template.cooked !== "string"
      )
        return unknown;
      return { kind: "literal", value: template.cooked };
    }
    case "ChainExpression":
    case "AwaitExpression":
      return resolve(
        child(
          node,
          node.type === "ChainExpression" ? "expression" : "argument",
        ),
      );
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return { kind: "function", node, scope };
    case "ConditionalExpression": {
      const condition = resolve(child(node, "test"));
      if (condition.kind === "literal")
        return resolve(
          child(node, condition.value ? "consequent" : "alternate"),
        );
      const alternatives = [
        resolve(child(node, "consequent")),
        resolve(child(node, "alternate")),
      ];
      if (alternatives[0] === alternatives[1])
        return alternatives[0] ?? unknown;
      return alternatives.some((value) => value.kind === "context") &&
        alternatives.every(
          (value) =>
            value.kind === "context" ||
            (value.kind === "literal" && value.value === null),
        )
        ? { kind: "context" }
        : unknown;
    }
    case "LogicalExpression": {
      if (!["||", "??"].includes(String(node.operator))) return unknown;
      const alternatives = [
        resolve(child(node, "left")),
        resolve(child(node, "right")),
      ];
      // Preserve browser API fallbacks, never promote an unrelated fallback object.
      return alternatives.some((value) => value.kind === "context") &&
        alternatives.every(
          (value) =>
            value.kind === "context" ||
            (value.kind === "literal" && value.value === null),
        )
        ? { kind: "context" }
        : unknown;
    }
    case "MemberExpression": {
      const object = resolve(child(node, "object"));
      const named = propertyName(
        child(node, "property"),
        Boolean(node.computed),
      );
      const computed =
        named === null && node.computed
          ? resolve(child(node, "property"))
          : unknown;
      const name =
        named ??
        (computed.kind === "literal" &&
        ["string", "number"].includes(typeof computed.value)
          ? String(computed.value)
          : null);
      if (!name) return unknown;
      if (object.kind === "object")
        return object.properties.get(name) ?? unknown;
      if (object.kind === "array" && /^\d+$/.test(name))
        return object.elements[Number(name)] ?? unknown;
      if (object.kind !== "global") return unknown;
      if (
        ["window", "globalThis"].includes(object.name) &&
        ["document", "navigator"].includes(name)
      )
        return { kind: "global", name };
      if (
        ["document", "navigator"].includes(object.name) &&
        name === "modelContext"
      )
        return { kind: "context" };
      return unknown;
    }
    case "CallExpression": {
      const callee = child(node, "callee");
      const arguments_ = children(node, "arguments").map(resolve);
      if (callee?.type === "MemberExpression") {
        const receiver = resolve(child(callee, "object"));
        const name = propertyName(
          child(callee, "property"),
          Boolean(callee.computed),
        );
        if (
          receiver.kind === "global" &&
          receiver.name === "Object" &&
          name === "values"
        ) {
          const object = arguments_[0];
          return object?.kind === "object" && object.complete
            ? {
                kind: "array",
                elements: [...object.properties.values()].slice(
                  0,
                  FINDING_LIMIT,
                ),
                truncated: object.properties.size > FINDING_LIMIT,
              }
            : unknown;
        }
        if (receiver.kind === "array" && name === "map") {
          const callback = arguments_[0];
          if (callback?.kind !== "function") return unknown;
          return {
            kind: "array",
            truncated: receiver.truncated,
            elements: receiver.elements.map((element, index) =>
              functionValue(
                callback,
                [element, { kind: "literal", value: index }, receiver],
                budget,
                depth + 1,
              ),
            ),
          };
        }
      }
      const callable = resolve(callee);
      return callable.kind === "function"
        ? functionValue(callable, arguments_, budget, depth + 1)
        : unknown;
    }
    case "ArrayExpression": {
      const truncated: boolean[] = [];
      const elements = Array.isArray(node.elements) ? node.elements : [];
      const array: Value = {
        kind: "array",
        truncated: elements.length > FINDING_LIMIT,
        elements: elements
          .slice(0, FINDING_LIMIT)
          .flatMap((element) => {
            if (!syntax(element)) return [unknown];
            if (element.type !== "SpreadElement") return [resolve(element)];
            const spread = resolve(child(element, "argument"));
            if (spread.kind === "array") {
              if (spread.truncated) truncated.push(true);
              return spread.elements;
            }
            return [unknown];
          })
          .slice(0, FINDING_LIMIT + 1),
      };
      return {
        ...array,
        truncated:
          array.truncated ||
          truncated.length > 0 ||
          array.elements.length > FINDING_LIMIT,
        elements: array.elements.slice(0, FINDING_LIMIT),
      };
    }
    case "ObjectExpression": {
      const properties = new Map<string, Value>();
      const unresolved: Syntax[] = [];
      for (const property of children(node, "properties").slice(0, 500)) {
        if (property.type === "SpreadElement") {
          const spread = resolve(child(property, "argument"));
          if (spread.kind === "object") {
            if (!spread.complete)
              for (const name of properties.keys())
                properties.set(name, unknown);
            for (const [name, value] of spread.properties)
              properties.set(name, value);
            if (!spread.complete) unresolved.push(property);
          } else {
            unresolved.push(property);
            // A later unknown spread can overwrite earlier metadata.
            for (const name of properties.keys()) properties.set(name, unknown);
          }
          continue;
        }
        const name = propertyName(
          child(property, "key"),
          Boolean(property.computed),
        );
        if (!name) {
          unresolved.push(property);
          for (const key of properties.keys()) properties.set(key, unknown);
          continue;
        }
        properties.set(
          name,
          property.kind === "init"
            ? resolve(child(property, "value"))
            : unknown,
        );
      }
      return {
        kind: "object",
        properties,
        complete:
          unresolved.length === 0 && children(node, "properties").length <= 500,
      };
    }
    default:
      return unknown;
  }
};

const bind = (
  pattern: Syntax | undefined,
  value: Value,
  scope: Scope,
): void => {
  if (!pattern) return;
  switch (pattern.type) {
    case "Identifier":
      scope.bindings.set(String(pattern.name), value);
      return;
    case "AssignmentPattern":
      bind(child(pattern, "left"), value, scope);
      return;
    case "RestElement":
      bind(child(pattern, "argument"), unknown, scope);
      return;
    case "ArrayPattern":
      (pattern.elements ?? []).forEach((element, index) => {
        bind(
          syntax(element) ? element : undefined,
          value.kind === "array" ? (value.elements[index] ?? unknown) : unknown,
          scope,
        );
      });
      return;
    case "ObjectPattern":
      for (const property of children(pattern, "properties")) {
        if (property.type === "RestElement") {
          const excluded = children(pattern, "properties")
            .filter((entry) => entry.type !== "RestElement")
            .map((entry) =>
              propertyName(child(entry, "key"), Boolean(entry.computed)),
            );
          bind(
            child(property, "argument"),
            value.kind === "object"
              ? {
                  kind: "object",
                  properties: new Map(
                    [...value.properties].filter(
                      ([name]) => !excluded.includes(name),
                    ),
                  ),
                  complete: value.complete && !excluded.includes(null),
                }
              : unknown,
            scope,
          );
          continue;
        }
        const name = propertyName(
          child(property, "key"),
          Boolean(property.computed),
        );
        const extracted = (() => {
          if (!name) return unknown;
          if (value.kind === "object")
            return value.properties.get(name) ?? unknown;
          if (
            value.kind === "global" &&
            ["document", "navigator"].includes(value.name) &&
            name === "modelContext"
          )
            return { kind: "context" } as const;
          return unknown;
        })();
        bind(
          child(
            property,
            property.type === "RestElement" ? "argument" : "value",
          ),
          extracted,
          scope,
        );
      }
  }
};

const variableScope = (scope: Scope): Scope =>
  scope.functionScope || !scope.parent ? scope : variableScope(scope.parent);

const assignmentScope = (scope: Scope, name: string): Scope =>
  scope.bindings.has(name) || scope.functionScope || !scope.parent
    ? scope
    : assignmentScope(scope.parent, name);

// `var` is function-scoped even when its declaration sits in a nested block.
const hoist = (node: Syntax | undefined, scope: Scope, depth = 0): void => {
  if (
    !node ||
    depth > 128 ||
    [
      "FunctionDeclaration",
      "FunctionExpression",
      "ArrowFunctionExpression",
    ].includes(node.type)
  )
    return;
  if (node.type === "VariableDeclaration" && node.kind === "var")
    for (const declaration of children(node, "declarations"))
      bind(child(declaration, "id"), unknown, scope);
  for (const descendant of nested(node)) hoist(descendant, scope, depth + 1);
};

const predeclare = (nodes: Syntax[], scope: Scope) => {
  for (const node of nodes) {
    if (node.type === "VariableDeclaration" && node.kind !== "var")
      for (const declaration of children(node, "declarations"))
        bind(child(declaration, "id"), unknown, scope);
    if (node.type === "FunctionDeclaration")
      bind(child(node, "id"), { kind: "function", node, scope }, scope);
    if (node.type === "ClassDeclaration")
      bind(child(node, "id"), unknown, scope);
    if (node.type === "ImportDeclaration")
      for (const specifier of children(node, "specifiers"))
        bind(child(specifier, "local"), unknown, scope);
  }
};

/** Resolve small data-returning helpers; this interprets AST values, never JavaScript. */
const functionValue = (
  callable: Extract<Value, { kind: "function" }>,
  arguments_: Value[],
  budget: Budget,
  depth: number,
): Value => {
  if (callable.node.async || callable.node.generator) return unknown;
  if (depth > 32 || budget.remaining <= 0) {
    budget.exhausted = true;
    return unknown;
  }
  budget.remaining -= 1;
  const body = child(callable.node, "body");
  if (!body) return unknown;
  const statements = children(body, "body");
  if (
    body.type === "BlockStatement" &&
    (statements.length > 20 ||
      !statements.every((statement) =>
        ["VariableDeclaration", "ReturnStatement"].includes(statement.type),
      ))
  )
    return unknown;
  const local: Scope = {
    bindings: new Map(),
    parent: callable.scope,
    functionScope: true,
  };
  children(callable.node, "params").forEach((parameter, index) => {
    bind(parameter, arguments_[index] ?? unknown, local);
  });
  predeclare(statements, local);
  if (body.type !== "BlockStatement")
    return abstractValue(body, local, budget, depth + 1);
  for (const statement of statements) {
    if (budget.remaining <= 0) return unknown;
    budget.remaining -= 1;
    if (statement.type === "ReturnStatement")
      return abstractValue(
        child(statement, "argument"),
        local,
        budget,
        depth + 1,
      );
    for (const declaration of children(statement, "declarations"))
      bind(
        child(declaration, "id"),
        abstractValue(child(declaration, "init"), local, budget, depth + 1),
        local,
      );
  }
  return unknown;
};

const metadata = (value: Value | undefined, limit = TEXT_LIMIT) =>
  value?.kind === "literal" && typeof value.value === "string"
    ? value.value.trim().slice(0, limit) || null
    : null;

const schemaType = (value: Value | undefined) => {
  const allowed = [
    "array",
    "boolean",
    "integer",
    "null",
    "number",
    "object",
    "string",
  ];
  const literal = metadata(value, 80);
  if (literal && allowed.includes(literal)) return literal;
  if (value?.kind !== "array" || value.truncated) return null;
  const types = value.elements.map((element) => metadata(element, 80));
  return types.length > 0 &&
    types.every((type) => type !== null && allowed.includes(type))
    ? types.join(" | ")
    : null;
};

const imperativeTool = (
  definition: Value,
  sourceUrl: string,
  pageUrl: string,
  registrationId: string,
): Tool => {
  const properties =
    definition.kind === "object" ? definition.properties : undefined;
  const name = metadata(properties?.get("name"), 160);
  const description = metadata(properties?.get("description"));
  const schema = properties?.get("inputSchema");
  const inputs =
    schema?.kind === "object" ? schema.properties.get("properties") : undefined;
  const required =
    schema?.kind === "object" ? schema.properties.get("required") : undefined;
  const incomplete = definition.kind !== "object" || !definition.complete;
  const schemaState: Tool["schemaState"] = (() => {
    if (!schema) return incomplete ? "unresolved" : "absent";
    if (schema.kind !== "object" || !schema.complete) return "unresolved";
    if (
      ["$ref", "allOf", "anyOf", "oneOf"].some((key) =>
        schema.properties.has(key),
      )
    )
      return "unresolved";
    if (
      inputs &&
      (inputs.kind !== "object" ||
        !inputs.complete ||
        inputs.properties.size > FINDING_LIMIT)
    )
      return "unresolved";
    if (
      required &&
      (required.kind !== "array" ||
        required.truncated ||
        required.elements.some((item) => metadata(item, 160) === null))
    )
      return "unresolved";
    if (
      inputs?.kind === "object" &&
      [...inputs.properties.values()].some(
        (input) =>
          input.kind !== "object" ||
          !input.complete ||
          ["type", "description"].some(
            (key) => input.properties.get(key)?.kind === "unknown",
          ),
      )
    )
      return "unresolved";
    return "resolved";
  })();
  const parameters: Tool["parameters"] =
    inputs?.kind === "object"
      ? [...inputs.properties].slice(0, FINDING_LIMIT).map(([name, input]) => {
          const fields = input.kind === "object" ? input.properties : undefined;
          return {
            name: name.slice(0, 160),
            type: schemaType(fields?.get("type")),
            description: metadata(fields?.get("description")),
            required: (() => {
              if (!required)
                return schema?.kind === "object" && schema.complete
                  ? false
                  : null;
              if (required.kind !== "array") return null;
              const names = required.elements.map((item) =>
                metadata(item, 160),
              );
              if (names.includes(name)) return true;
              return required.truncated || names.includes(null) ? null : false;
            })(),
          };
        })
      : [];
  const handler = properties?.get("execute");
  const execution: Tool["execution"] = (() => {
    if (!handler) return incomplete ? "unresolved" : "missing";
    if (handler.kind === "function") return "declared";
    return handler.kind === "unknown" ? "unresolved" : "missing";
  })();
  const issues: Tool["issues"] = [];
  for (const [field, issue] of [
    ["name", "missingName"],
    ["description", "missingDescription"],
  ] as const) {
    const value = properties?.get(field);
    if (
      (!value && !incomplete) ||
      (value?.kind === "literal" && !metadata(value))
    )
      issues.push(issue);
  }
  if (
    incomplete ||
    (!name && !issues.includes("missingName")) ||
    (!description && !issues.includes("missingDescription")) ||
    (schema && (schema.kind !== "object" || !schema.complete)) ||
    (inputs && (inputs.kind !== "object" || !inputs.complete))
  )
    issues.push("unresolvedDefinition");
  // inputSchema is optional in the current WebMCP draft, including parameterless tools.
  return {
    name,
    description,
    kind: "imperative",
    sourceUrl,
    pageUrl,
    registrationId,
    inputNames: parameters.map(({ name }) => name),
    parameters,
    schemaState,
    execution,
    issues,
  };
};

export const inspectScript = (
  source: string,
  sourceUrl: string,
  pageUrl: string,
  sourceScope = "",
) => {
  const tools: Tool[] = [];
  const signals: Signal[] = [];
  if (Buffer.byteLength(source, "utf8") > SCRIPT_LIMIT_BYTES)
    return { tools, signals, parseFailures: 1 };
  const module = resultify(() =>
    parseJavaScript(source, { ecmaVersion: "latest", sourceType: "module" }),
  );
  const parsed = module.success
    ? module
    : resultify(() =>
        parseJavaScript(source, {
          ecmaVersion: "latest",
          sourceType: "script",
          allowReturnOutsideFunction: false,
        }),
      );
  if (!parsed.success) return { tools, signals, parseFailures: 1 };
  // Count work, not distinct nodes: nested for-of loops revisit the same AST.
  const budget: Budget = { remaining: NODE_LIMIT, exhausted: false };
  const failures = new Set<string>();
  const emit = (kind: Signal["kind"]) => {
    if (!signals.some((signal) => signal.kind === kind))
      signals.push({ kind, sourceUrl, pageUrl });
  };
  const parameterDefaults = (
    pattern: Syntax | undefined,
    scope: Scope,
    depth = 0,
  ): void => {
    if (!pattern) return;
    if (depth > 48 || budget.remaining <= 0) {
      budget.exhausted = true;
      return;
    }
    budget.remaining -= 1;
    if (pattern.type === "AssignmentPattern") {
      const fallback = abstractValue(child(pattern, "right"), scope, budget);
      // Defaults describe possible browser API access, never runtime arguments or metadata.
      if (
        (fallback.kind === "global" &&
          ["document", "navigator", "window", "globalThis"].includes(
            fallback.name,
          )) ||
        fallback.kind === "context"
      ) {
        bind(child(pattern, "left"), fallback, scope);
        if (fallback.kind === "context") emit("context-api");
      }
      parameterDefaults(child(pattern, "left"), scope, depth + 1);
      return;
    }
    if (pattern.type === "ObjectPattern")
      for (const property of children(pattern, "properties"))
        parameterDefaults(child(property, "value"), scope, depth + 1);
    if (pattern.type === "ArrayPattern")
      for (const element of children(pattern, "elements"))
        parameterDefaults(element, scope, depth + 1);
  };
  const addTool = (definition: Value, registration: Syntax) => {
    if (tools.length >= FINDING_LIMIT) {
      failures.add("tools");
      return;
    }
    const tool = imperativeTool(
      definition,
      sourceUrl,
      pageUrl,
      `${sourceUrl}#${sourceScope ? `${sourceScope}-` : ""}call-${registration.start ?? 0}`,
    );
    if (
      !tools.some(
        (existing) => JSON.stringify(existing) === JSON.stringify(tool),
      )
    )
      tools.push(tool);
  };
  const visit = (node: Syntax | undefined, scope: Scope, depth = 0): void => {
    if (!node) return;
    if (depth > 128 || budget.remaining <= 0) {
      failures.add("complexity");
      return;
    }
    budget.remaining -= 1;
    const descend = (target: Syntax | undefined, current = scope) =>
      visit(target, current, depth + 1);
    switch (node.type) {
      case "Program":
      case "BlockStatement": {
        const block: Scope = {
          bindings: new Map(),
          parent: scope,
          functionScope: node.type === "Program",
        };
        const body = children(node, "body");
        if (node.type === "Program") hoist(node, block);
        predeclare(body, block);
        for (const statement of body) descend(statement, block);
        return;
      }
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression": {
        const local: Scope = {
          bindings: new Map(),
          parent: scope,
          functionScope: true,
        };
        bind(child(node, "id"), unknown, local);
        for (const parameter of children(node, "params"))
          bind(parameter, unknown, local);
        for (const parameter of children(node, "params"))
          parameterDefaults(parameter, local);
        hoist(child(node, "body"), local);
        descend(child(node, "body"), local);
        return;
      }
      case "CatchClause": {
        const local: Scope = { bindings: new Map(), parent: scope };
        bind(child(node, "param"), unknown, local);
        descend(child(node, "body"), local);
        return;
      }
      case "VariableDeclaration":
        for (const declaration of children(node, "declarations")) {
          descend(child(declaration, "init"));
          if (node.kind === "var" && !child(declaration, "init")) continue;
          bind(
            child(declaration, "id"),
            abstractValue(child(declaration, "init"), scope, budget),
            node.kind === "var" ? variableScope(scope) : scope,
          );
        }
        return;
      case "ForStatement":
      case "ForInStatement": {
        const local: Scope = { bindings: new Map(), parent: scope };
        for (const descendant of nested(node)) descend(descendant, local);
        return;
      }
      case "ForOfStatement": {
        descend(child(node, "right"));
        const iterable = abstractValue(child(node, "right"), scope, budget);
        if (iterable.kind === "array" && iterable.truncated)
          failures.add("tools");
        const declaration = child(node, "left");
        const pattern =
          declaration?.type === "VariableDeclaration"
            ? child(
                children(declaration, "declarations")[0] ?? { type: "Unknown" },
                "id",
              )
            : declaration;
        for (const value of iterable.kind === "array"
          ? iterable.elements
          : [unknown]) {
          if (budget.remaining <= 0) break;
          const local: Scope = { bindings: new Map(), parent: scope };
          bind(pattern, value, local);
          descend(child(node, "body"), local);
        }
        return;
      }
      case "AssignmentExpression": {
        descend(child(node, "right"));
        const target = child(node, "left");
        if (target?.type === "MemberExpression") {
          // A property mutation can invalidate captured names/schema. Keep it unresolved.
          const object = child(target, "object");
          if (object?.type === "Identifier") {
            const previous = lookup(scope, String(object.name));
            if (previous.kind === "object") {
              previous.properties.clear();
              previous.complete = false;
            }
            bind(object, unknown, assignmentScope(scope, String(object.name)));
          }
          return;
        }
        bind(
          target,
          node.operator === "="
            ? abstractValue(child(node, "right"), scope, budget)
            : unknown,
          target?.type === "Identifier"
            ? assignmentScope(scope, String(target.name))
            : scope,
        );
        return;
      }
      case "MemberExpression":
        if (abstractValue(node, scope, budget).kind === "context")
          emit("context-api");
        break;
      case "CallExpression": {
        const expression = child(node, "callee");
        const callee =
          expression?.type === "ChainExpression"
            ? child(expression, "expression")
            : expression;
        if (
          callee?.type !== "MemberExpression" ||
          abstractValue(child(callee, "object"), scope, budget).kind !==
            "context"
        )
          break;
        const name = propertyName(
          child(callee, "property"),
          Boolean(callee.computed),
        );
        const argument = abstractValue(
          children(node, "arguments")[0],
          scope,
          budget,
        );
        if (name === "registerTool") {
          emit("register-tool");
          addTool(argument, node);
        }
        if (name === "provideContext") {
          emit("provide-context");
          const collection =
            argument.kind === "object"
              ? argument.properties.get("tools")
              : undefined;
          if (collection?.kind === "array") {
            if (collection.truncated) failures.add("tools");
            for (const definition of collection.elements)
              addTool(definition, node);
          } else if (
            collection ||
            argument.kind !== "object" ||
            !argument.complete
          )
            addTool(unknown, node);
        }
        break;
      }
    }
    for (const descendant of nested(node)) descend(descendant);
  };
  const traversal = resultify(() =>
    visit(parsed.data as unknown as Syntax, { bindings: new Map() }),
  );
  if (!traversal.success) failures.add("traversal");
  if (budget.exhausted || budget.remaining <= 0) failures.add("complexity");
  return { tools, signals, parseFailures: failures.size ? 1 : 0 };
};

const isElement = (node: HtmlNode): node is Element => "tagName" in node;
const attribute = (element: Element, name: string) =>
  element.attrs.find((entry) => entry.name === name)?.value;
const resolveUrl = (value: string, base: string) => {
  const parsed = resultify(() => new URL(value, base));
  if (!parsed.success || !["https:", "http:"].includes(parsed.data.protocol))
    return null;
  parsed.data.hash = "";
  return parsed.data.href;
};
const ancestors = (element: Element, cache: HtmlCache): Element[] => {
  const cached = cache.parents.get(element);
  if (cached) return cached;
  const parents: Element[] = [];
  const collect = (node: HtmlNode | null | undefined): void => {
    if (!node || parents.length >= 128 || !isElement(node)) return;
    parents.push(node);
    collect(node.parentNode);
  };
  collect(element.parentNode);
  cache.parents.set(element, parents);
  return parents;
};
const enabledControl = (element: Element, cache: HtmlCache) => {
  if (
    attribute(element, "disabled") !== undefined ||
    attribute(element, "readonly") !== undefined
  )
    return false;
  const parents = ancestors(element, cache);
  return !parents.some((parent) => {
    if (
      parent.tagName !== "fieldset" ||
      attribute(parent, "disabled") === undefined
    )
      return false;
    if (!cache.legends.has(parent))
      cache.legends.set(
        parent,
        parent.childNodes.find(
          (node) => isElement(node) && node.tagName === "legend",
        ) ?? null,
      );
    const legend = cache.legends.get(parent);
    return !legend || !parents.includes(legend as Element);
  });
};
const executable = (element: Element) => {
  if (attribute(element, "nomodule") !== undefined) return false;
  const type = (attribute(element, "type") ?? "")
    .trim()
    .toLowerCase()
    .split(";")[0];
  return (
    !type ||
    type === "module" ||
    /^(?:application|text)\/(?:x-)?(?:java|ecma)script(?:1\.[0-5])?$/.test(type)
  );
};

const cleaned = (value: string | undefined, limit = TEXT_LIMIT) =>
  value?.replace(/\s+/g, " ").trim().slice(0, limit) || null;
const hiddenElement = (element: Element) =>
  attribute(element, "hidden") !== undefined ||
  attribute(element, "inert") !== undefined ||
  attribute(element, "aria-hidden") === "true" ||
  /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!important)?\s*(?:;|$)/i.test(
    attribute(element, "style") ?? "",
  );
const publicElement = (element: Element, cache: HtmlCache) =>
  !hiddenElement(element) && !ancestors(element, cache).some(hiddenElement);

/** Text labels only: never inspect control values, textarea contents or option values. */
const labelText = (element: Element, cache: HtmlCache) => {
  if (!publicElement(element, cache)) return null;
  const chunks: string[] = [];
  const budget = { remaining: 512, characters: 0 };
  const collect = (node: HtmlNode): void => {
    if (budget.remaining <= 0 || budget.characters >= TEXT_LIMIT) return;
    budget.remaining -= 1;
    if (
      isElement(node) &&
      (hiddenElement(node) ||
        [
          "input",
          "textarea",
          "select",
          "script",
          "style",
          "template",
          "noscript",
        ].includes(node.tagName))
    )
      return;
    if ("value" in node && typeof node.value === "string") {
      const text = node.value.slice(0, TEXT_LIMIT - budget.characters);
      chunks.push(text);
      budget.characters += text.length;
    }
    if ("childNodes" in node)
      for (const descendant of node.childNodes) collect(descendant);
  };
  collect(element);
  return cleaned(chunks.join(" "));
};

const escapeSelector = (value: string) =>
  Array.from(value)
    .map((character, index) =>
      (/^[a-zA-Z_-]$/.test(character) && value !== "-") ||
      (/^[0-9]$/.test(character) &&
        index > 0 &&
        !(index === 1 && value[0] === "-"))
        ? character
        : `\\${character.codePointAt(0)?.toString(16)} `,
    )
    .join("");
const formSelector = (
  form: Element,
  identifiers: Map<string, number>,
  cache: HtmlCache,
) => {
  const identifier = attribute(form, "id");
  if (
    identifier &&
    identifiers.get(identifier) === 1 &&
    identifier.length <= 256
  )
    return `#${escapeSelector(identifier)}`;
  return [...ancestors(form, cache).reverse(), form]
    .map((element) => {
      const parent = element.parentNode;
      const siblings =
        parent && "childNodes" in parent
          ? parent.childNodes.filter(
              (sibling) =>
                isElement(sibling) && sibling.tagName === element.tagName,
            )
          : [element];
      if (element.tagName.length <= 64)
        return `${escapeSelector(element.tagName)}:nth-of-type(${siblings.indexOf(element) + 1})`;
      const children =
        parent && "childNodes" in parent
          ? parent.childNodes.filter(isElement)
          : [element];
      return `*:nth-child(${children.indexOf(element) + 1})`;
    })
    .join(" > ");
};
const formAction = (form: Element, pageUrl: string, base: string) => {
  const action = attribute(form, "action")?.trim();
  const parsed = resultify(
    () => new URL(action || pageUrl, action ? base : pageUrl),
  );
  if (!parsed.success || !["http:", "https:"].includes(parsed.data.protocol))
    return null;
  parsed.data.username = "";
  parsed.data.password = "";
  parsed.data.search = "";
  parsed.data.hash = "";
  return parsed.data.href;
};
const sensitiveControl = (control: Element) =>
  attribute(control, "type")?.toLowerCase() === "password" ||
  /password|passcode|authenticity|csrf|payment|billing|account[_\s-]*(?:number|token)|(?:access|auth|session)[_\s-]*token|api[_\s-]*key|secret|credit[_\s-]*card|card[_\s-]*number|(?:^|\W)(?:cvv|cvc)(?:\W|$)|cc-(?:number|csc|exp)|one-time-code|username/i.test(
    [
      attribute(control, "name"),
      attribute(control, "id"),
      attribute(control, "autocomplete"),
    ]
      .filter(Boolean)
      .join(" "),
  );

export const inspectHtml = (html: string, pageUrl: string) => {
  const tools: Tool[] = [];
  const forms: FormEvidence[] = [];
  const signals: Signal[] = [];
  const scripts: { url: string | null; source: string }[] = [];
  const links: string[] = [];
  if (Buffer.byteLength(html, "utf8") > HTML_LIMIT_BYTES)
    return {
      tools,
      forms,
      signals,
      scripts,
      links,
      baseUrl: pageUrl,
      parseFailures: 1,
    };
  const failures: string[] = [];
  const cache: HtmlCache = { parents: new WeakMap(), legends: new WeakMap() };
  const parsed = resultify(() =>
    parseHtml(html, {
      scriptingEnabled: true,
      onParseError: (error) => {
        if (error.code !== "missing-doctype" && failures.length < FINDING_LIMIT)
          failures.push(error.code);
      },
    }),
  );
  if (!parsed.success)
    return {
      tools,
      forms,
      signals,
      scripts,
      links,
      baseUrl: pageUrl,
      parseFailures: 1,
    };
  const elements: Element[] = [];
  const collect = (node: HtmlNode, depth = 0): void => {
    if (depth > 128 || elements.length >= NODE_LIMIT) {
      if (!failures.includes("complexity")) failures.push("complexity");
      return;
    }
    if (isElement(node)) {
      if (["template", "noscript"].includes(node.tagName)) return;
      elements.push(node);
    }
    if ("childNodes" in node)
      for (const descendant of node.childNodes) collect(descendant, depth + 1);
  };
  collect(parsed.data);
  const baseElement = elements.find(
    (element) =>
      element.tagName === "base" && attribute(element, "href") !== undefined,
  );
  const base = baseElement
    ? (resolveUrl(attribute(baseElement, "href") ?? "", pageUrl) ?? pageUrl)
    : pageUrl;
  const formElements = elements.filter(
    (element) =>
      element.namespaceURI === HTML_NAMESPACE && element.tagName === "form",
  );
  const controls = elements.filter(
    (element) =>
      element.namespaceURI === HTML_NAMESPACE &&
      ["input", "select", "textarea"].includes(element.tagName) &&
      enabledControl(element, cache),
  );
  const identified = new Map<string, Element>();
  const identifierCounts = new Map<string, number>();
  const labels = new Map<string, Element[]>();
  const legends = new Map<Element, Element>();
  const text = new WeakMap<Element, string | null>();
  const readText = (element: Element) => {
    if (!text.has(element)) text.set(element, labelText(element, cache));
    return text.get(element) ?? null;
  };
  for (const element of elements) {
    const identifier = attribute(element, "id");
    if (identifier) {
      if (!identified.has(identifier)) identified.set(identifier, element);
      identifierCounts.set(
        identifier,
        (identifierCounts.get(identifier) ?? 0) + 1,
      );
    }
    const target =
      element.tagName === "label" ? attribute(element, "for") : undefined;
    if (target) {
      const associated = labels.get(target) ?? [];
      if (associated.length < 8) associated.push(element);
      labels.set(target, associated);
    }
    if (element.tagName === "legend") {
      const form = ancestors(element, cache).find(
        (parent) => parent.tagName === "form",
      );
      if (form && !legends.has(form)) legends.set(form, element);
    }
  }
  const referencedText = (element: Element, name: string) =>
    cleaned(
      (attribute(element, name) ?? "")
        .split(/\s+/)
        .slice(0, 8)
        .flatMap((identifier) => {
          const referenced = identified.get(identifier);
          return referenced ? [readText(referenced) ?? ""] : [];
        })
        .join(" "),
    );
  const associatedLabel = (element: Element) => {
    const identifier = attribute(element, "id");
    const matching =
      identifier && identified.get(identifier) === element
        ? (labels.get(identifier) ?? [])
        : [];
    const explicit = cleaned(
      matching.map((label) => readText(label) ?? "").join(" "),
    );
    if (explicit) return explicit;
    const wrapping = ancestors(element, cache).find(
      (parent) => parent.tagName === "label",
    );
    return wrapping ? readText(wrapping) : null;
  };
  const fieldDescription = (control: Element) =>
    cleaned(attribute(control, "toolparamdescription")) ??
    associatedLabel(control) ??
    cleaned(attribute(control, "aria-description")) ??
    referencedText(control, "aria-describedby") ??
    cleaned(attribute(control, "aria-label")) ??
    referencedText(control, "aria-labelledby");
  const formInputs = new Map<
    Element,
    Map<string, Tool["parameters"][number]>
  >();
  const publicFields = new Map<Element, FormEvidence["fields"]>();
  const sensitiveForms = new Set<Element>();
  for (const control of controls) {
    const owner = attribute(control, "form");
    const associated =
      owner !== undefined
        ? identified.get(owner)
        : ancestors(control, cache).find(
            (parent) =>
              parent.namespaceURI === HTML_NAMESPACE &&
              parent.tagName === "form",
          );
    if (associated?.tagName !== "form") continue;
    if (sensitiveControl(control)) sensitiveForms.add(associated);
    const type =
      control.tagName === "input"
        ? (attribute(control, "type") || "text").toLowerCase()
        : control.tagName === "select"
          ? attribute(control, "multiple") !== undefined
            ? "select-multiple"
            : "select-one"
          : "textarea";
    if (
      control.tagName === "input" &&
      ["submit", "button", "reset", "image"].includes(type)
    )
      continue;
    const name = cleaned(attribute(control, "name"), 160);
    const required = attribute(control, "required") !== undefined;
    const description = fieldDescription(control);
    if (type !== "hidden" && publicElement(control, cache)) {
      const fields = publicFields.get(associated) ?? [];
      if (fields.length < FINDING_LIMIT)
        fields.push({ name, type, description, required });
      else if (!failures.includes("fields")) failures.push("fields");
      publicFields.set(associated, fields);
    }
    // Chromium permits described hidden controls in declarative tool schemas.
    // They remain excluded from the public form inventory, including all values.
    if (
      !name ||
      (type === "hidden" && !attribute(control, "toolparamdescription")?.trim())
    )
      continue;
    const parameters =
      formInputs.get(associated) ??
      new Map<string, Tool["parameters"][number]>();
    const previous = parameters.get(name);
    if (previous || parameters.size < FINDING_LIMIT)
      parameters.set(name, {
        name,
        type,
        description: previous?.description ?? description,
        required: previous?.required === true || required,
      });
    else if (!failures.includes("inputs")) failures.push("inputs");
    formInputs.set(associated, parameters);
  }
  formElements.forEach((form, index) => {
    const declaredName = attribute(form, "toolname");
    const declaredDescription = attribute(form, "tooldescription");
    const declared =
      declaredName !== undefined || declaredDescription !== undefined;
    const name = declaredName?.trim().slice(0, 160) || null;
    const description = cleaned(declaredDescription);
    if (
      publicElement(form, cache) &&
      attribute(form, "disabled") === undefined
    ) {
      if (forms.length < FINDING_LIMIT) {
        const action = formAction(form, pageUrl, base);
        const method = attribute(form, "method")?.toLowerCase();
        const legend = legends.get(form);
        forms.push({
          id: `${pageUrl}#form-${index + 1}`,
          pageUrl,
          selector: formSelector(form, identifierCounts, cache),
          label:
            cleaned(attribute(form, "aria-label")) ??
            referencedText(form, "aria-labelledby") ??
            associatedLabel(form) ??
            (legend ? readText(legend) : null) ??
            cleaned(attribute(form, "name")) ??
            cleaned(attribute(form, "id")),
          action,
          method: method === "post" || method === "dialog" ? method : "get",
          declared,
          autoSubmit: attribute(form, "toolautosubmit") !== undefined,
          toolName: name,
          sensitive:
            sensitiveForms.has(form) ||
            /\/(?:accounts?|login|signin|sign-in|checkout|payments?|password|auth)(?:\/|$)/i.test(
              action ? new URL(action).pathname : "",
            ),
          fields: publicFields.get(form) ?? [],
        });
      } else if (!failures.includes("forms")) failures.push("forms");
    }
    if (!declared) return;
    if (tools.length >= FINDING_LIMIT) {
      if (!failures.includes("tools")) failures.push("tools");
      return;
    }
    const issues: Tool["issues"] = [];
    if (!name) issues.push("missingName");
    if (!description) issues.push("missingDescription");
    if (attribute(form, "toolautosubmit") !== undefined)
      issues.push("autoSubmit");
    const parameters = [...(formInputs.get(form)?.values() ?? [])];
    tools.push({
      name,
      description,
      kind: "declarative",
      sourceUrl: pageUrl,
      pageUrl,
      registrationId: `${pageUrl}#form-${index + 1}`,
      inputNames: parameters.map(({ name }) => name),
      parameters,
      schemaState: "notApplicable",
      execution: "form",
      issues,
    });
  });
  for (const element of elements) {
    if (element.tagName === "script" && executable(element)) {
      if (scripts.length >= FINDING_LIMIT) {
        if (!failures.includes("scripts")) failures.push("scripts");
        continue;
      }
      const sourceAttribute = attribute(element, "src");
      if (sourceAttribute !== undefined) {
        const url = sourceAttribute.trim()
          ? resolveUrl(sourceAttribute, base)
          : null;
        if (url) scripts.push({ url, source: "" });
        else failures.push("script-url");
        continue;
      }
      const source = element.childNodes
        .flatMap((node) => ("value" in node ? [node.value] : []))
        .join("");
      scripts.push({ url: null, source });
      const inspected = inspectScript(
        source,
        pageUrl,
        pageUrl,
        `inline-${scripts.length}`,
      );
      if (
        tools.length + inspected.tools.length > FINDING_LIMIT ||
        signals.length + inspected.signals.length > FINDING_LIMIT
      )
        failures.push("findings");
      tools.push(...inspected.tools.slice(0, FINDING_LIMIT - tools.length));
      signals.push(
        ...inspected.signals.slice(0, FINDING_LIMIT - signals.length),
      );
      if (inspected.parseFailures) failures.push("script");
    }
    if (element.tagName !== "a" || links.length >= FINDING_LIMIT) continue;
    const href = attribute(element, "href");
    if (!href) continue;
    const link = resolveUrl(href, base);
    if (!link || links.includes(link)) continue;
    const target = new URL(link);
    const page = resultify(() => new URL(pageUrl));
    if (!page.success || target.origin !== page.data.origin) continue;
    if (
      !/(?:^|\/)(?:products?|collections?|product-category|catalog|shop|search)(?:\/|$)/i.test(
        target.pathname,
      )
    )
      continue;
    links.push(link);
  }
  return {
    tools,
    forms,
    signals,
    scripts,
    links,
    baseUrl: base,
    parseFailures: failures.length,
  };
};
