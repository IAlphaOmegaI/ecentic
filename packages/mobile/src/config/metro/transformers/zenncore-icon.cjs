const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

/**
 * @typedef {Object} TransformOptions
 * @property {string} src
 * @property {string} filename
 * @property {Record<string, unknown>} [options]
 */

/**
 * @typedef {Object} Transformer
 * @property {(options: TransformOptions) => Promise<TransformOptions>} transform
 */

/**
 * @param {string} src
 * @returns {Promise<string>}
 */

const defaultTransformer = require("@expo/metro-config/babel-transformer");

//TODO: remove web specific props like xmlns,aria and data attributes, etc.
//TODO: format added code (import, unsupported elements comment, etc.)
//TODO: remove fill: "currentColor" as it doesn't work in react native (stroke does work)
// or instead of fill-x use text-x

const svgComponent = {
  svg: "Svg",
  g: "G",
  circle: "Circle",
  clipPath: "ClipPath",
  defs: "Defs",
  ellipse: "Ellipse",
  feBlend: "FeBlend",
  feColorMatrix: "FeColorMatrix",
  feComponentTransfer: "FeComponentTransfer",
  feComposite: "FeComposite",
  feConvolveMatrix: "FeConvolveMatrix",
  feDiffuseLighting: "FeDiffuseLighting",
  feDisplacementMap: "FeDisplacementMap",
  feDistantLight: "FeDistantLight",
  feDropShadow: "FeDropShadow",
  feFlood: "FeFlood",
  feFuncA: "FeFuncA",
  feFuncB: "FeFuncB",
  feFuncG: "FeFuncG",
  feFuncR: "FeFuncR",
  feGaussianBlur: "FeGaussianBlur",
  feImage: "FeImage",
  feMerge: "FeMerge",
  feMergeNode: "FeMergeNode",
  feMorphology: "FeMorphology",
  feOffset: "FeOffset",
  fePointLight: "FePointLight",
  feSpecularLighting: "FeSpecularLighting",
  feSpotLight: "FeSpotLight",
  feTile: "FeTile",
  feTurbulence: "FeTurbulence",
  filter: "Filter",
  foreignObject: "ForeignObject",
  image: "Image",
  line: "Line",
  linearGradient: "LinearGradient",
  marker: "Marker",
  mask: "Mask",
  path: "Path",
  pattern: "Pattern",
  polygon: "Polygon",
  polyline: "Polyline",
  radialGradient: "RadialGradient",
  rect: "Rect",
  shape: "Shape",
  stop: "Stop",
  symbol: "Symbol",
  tspan: "TSpan",
  text: "Text",
  textPath: "TextPath",
  use: "Use",
};

const normalizeNumericProp = (node) => {
  if (t.isStringLiteral(node)) {
    const propValue = node.value.trim();

    if (/^-?\d*\.?\d+$/.test(propValue)) {
      const num = Number.parseFloat(propValue);

      return num < 0
        ? t.unaryExpression("-", t.numericLiteral(Math.abs(num)))
        : t.numericLiteral(num);
    }

    return node;
  }

  if (t.isConditionalExpression(node)) {
    return t.conditionalExpression(
      node.test,
      normalizeNumericProp(node.consequent),
      normalizeNumericProp(node.alternate),
    );
  }

  if (t.isLogicalExpression(node)) {
    return t.logicalExpression(
      node.operator,
      node.left,
      normalizeNumericProp(node.right),
    );
  }

  return node;
};

const normalizeProps = (propsArg) => {
  for (const prop of propsArg.properties) {
    if (!t.isObjectProperty(prop)) continue;

    if (
      t.isStringLiteral(prop.value) ||
      t.isConditionalExpression(prop.value) ||
      t.isLogicalExpression(prop.value)
    ) {
      prop.value = normalizeNumericProp(prop.value);
    }
  }
};

const replaceElement = (path, componentName) => {
  if (!componentName) {
    const isNormalElement = t.isArrayExpression(path.parent);

    path.node.leadingComments = path.node.leadingComments?.filter(
      (comment) => !/[@]__PURE__/.test(comment.value),
    );

    if (isNormalElement) {
      // remove element entirely if not rendered dynamically (e.g. logical,conditional,loop expression etc.)
      path.remove();
    } else path.replaceWith(t.nullLiteral());

    return false;
  }

  // Use StyledSvg for the root svg element to enable uniwind styling
  const elementName = componentName === "Svg" ? "StyledSvg" : componentName;
  path.node.arguments[0] = t.identifier(elementName);

  return true;
};

/**
 * transformSvgJsxToRnSvg – transform svg jsx-runtime to react-native compatible jsx-runtime,
 * handles imports from react-native-svg, transforming element names, converting numeric string props and CSS interoping icons for use with nativewind
 *
 */
const transformSvgJsxToRnSvg = (code) => {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });

  // use sets instead of arrays to avoid duplicates
  const imports = new Set();
  const unsupportedElements = new Set();

  traverse(ast, {
    CallExpression: (path) => {
      const { callee } = path.node;
      const isJsxElement =
        t.isIdentifier(callee) &&
        (callee.name === "jsx" || callee.name === "jsxs");

      if (isJsxElement) {
        const tagArg = path.node.arguments[0];

        if (t.isStringLiteral(tagArg)) {
          const componentName = svgComponent[tagArg.value];

          const replaced = replaceElement(path, componentName);

          if (!replaced) {
            unsupportedElements.add(tagArg.value);
            return;
          }

          imports.add(componentName);
        }

        const propsArg = path.node.arguments[1];
        if (t.isObjectExpression(propsArg)) normalizeProps(propsArg);
      }
    },
  });

  if (imports.size > 0) {
    const importList = Array.from(imports);

    ast.program.body.unshift(
      t.importDeclaration(
        importList.map((name) =>
          t.importSpecifier(t.identifier(name), t.identifier(name)),
        ),
        t.stringLiteral("react-native-svg"),
      ),
    );

    // Add withUniwind import and StyledSvg declaration for the Svg element
    if (imports.has("Svg")) {
      ast.program.body.unshift(
        t.importDeclaration(
          [
            t.importSpecifier(
              t.identifier("withUniwind"),
              t.identifier("withUniwind"),
            ),
          ],
          t.stringLiteral("uniwind"),
        ),
      );

      // Insert after the imports: const StyledSvg = withUniwind(Svg);
      const styledSvgDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier("StyledSvg"),
          t.callExpression(t.identifier("withUniwind"), [t.identifier("Svg")]),
        ),
      ]);

      // Find the last import and insert after it
      let lastImportIndex = 0;
      for (let i = 0; i < ast.program.body.length; i++) {
        if (t.isImportDeclaration(ast.program.body[i])) {
          lastImportIndex = i;
        }
      }
      ast.program.body.splice(lastImportIndex + 1, 0, styledSvgDeclaration);
    }
  }

  if (unsupportedElements.size > 0) {
    const unsupportedElementsArray = Array.from(unsupportedElements);

    const comment = ` Elements not supported by react-native-svg are dropped: ${unsupportedElementsArray.join(", ")} `;

    if (ast.program.body[0]) {
      ast.program.body[0].leadingComments = [
        { type: "CommentBlock", value: comment },
      ];
    }
  }

  return generate(ast).code;
};

const createIconTransformer = (transformer) => {
  return ({ src, filename, ...rest }) => {
    //TODO: better way to identify @zenncore/icons icons (filter out other @zenncore/icons exports)

    const isZenncoreIcon =
      filename.includes("node_modules/@zenncore/icons/dist/index.js") ||
      filename.includes("packages/shared/icons/dist/index.js");

    if (isZenncoreIcon) {
      return transformer.transform({
        src: transformSvgJsxToRnSvg(src),
        filename,
        ...rest,
      });
    }
    return transformer.transform({ src, filename, ...rest });
  };
};

/** @type {{ transform: (options: TransformOptions) => Promise<TransformOptions> }} */
module.exports = {
  transform: createIconTransformer(
    /** @type {Transformer} */ (defaultTransformer),
  ),
};
