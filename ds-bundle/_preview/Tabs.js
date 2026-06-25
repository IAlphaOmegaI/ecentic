var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) =>
    function __init() {
      if (err) throw err[0];
      try {
        return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res;
      } catch (e) {
        throw ((err = [e]), e);
      }
    };
  var __commonJS = (cb, mod) =>
    function __require() {
      try {
        return (
          mod ||
            (0, cb[__getOwnPropNames(cb)[0]])(
              (mod = { exports: {} }).exports,
              mod,
            ),
          mod.exports
        );
      } catch (e) {
        throw ((mod = 0), e);
      }
    };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if ((from && typeof from === "object") || typeof from === "function") {
      for (const key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (
    __copyProps(target, mod, "default"),
    secondTarget && __copyProps(secondTarget, mod, "default")
  );
  var __toESM = (mod, isNodeMode, target) => (
    (target = mod != null ? __create(__getProtoOf(mod)) : {}),
    __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule
        ? __defProp(target, "default", { value: mod, enumerable: true })
        : target,
      mod,
    )
  );
  var __toCommonJS = (mod) =>
    __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {},
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.ZennWeb;
    },
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function jsx2(t, p, k) {
        return R.createElement(
          t,
          k === void 0 ? p : Object.assign({ key: k }, p),
        );
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsx2;
      module.exports.jsxDEV = jsx2;
      module.exports.Fragment = R.Fragment;
    },
  });

  // .design-sync/previews/Tabs.tsx
  var Tabs_exports = {};
  __export(Tabs_exports, {
    FullWidth: () => FullWidth,
    Horizontal: () => Horizontal,
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default,
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.ZennWeb;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/Tabs.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Horizontal = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 480 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Tabs, {
        defaultValue: "overview",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TabsList, {
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                ds_exports.TabsIndicator,
                {},
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tab, {
                value: "overview",
                children: "Overview",
              }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tab, {
                value: "agents",
                children: "AI Agents",
              }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tab, {
                value: "competitors",
                children: "Competitors",
              }),
            ],
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsPanel, {
            value: "overview",
            style: { padding: 16, color: "var(--color-foreground)" },
            children:
              "Your product wins 62% of AI shopping-agent comparisons this week.",
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsPanel, {
            value: "agents",
            style: { padding: 16, color: "var(--color-foreground)" },
            children: "Simulated across GPT-4, Claude, Gemini and Perplexity.",
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsPanel, {
            value: "competitors",
            style: { padding: 16, color: "var(--color-foreground)" },
            children: "Tracking 8 competitors across 3 marketplaces.",
          }),
        ],
      }),
    });
  var FullWidth = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 480 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Tabs, {
        defaultValue: "auto",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TabsList, {
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                ds_exports.TabsIndicator,
                {},
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tab, {
                value: "auto",
                style: { flex: 1 },
                children: "Auto-detect",
              }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tab, {
                value: "url",
                style: { flex: 1 },
                children: "Paste URLs",
              }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tab, {
                value: "search",
                style: { flex: 1 },
                children: "Search brand",
              }),
            ],
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsPanel, {
            value: "auto",
            style: { padding: 16, color: "var(--color-foreground)" },
            children: "We detect competitors automatically from your catalog.",
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsPanel, {
            value: "url",
            style: { padding: 16, color: "var(--color-foreground)" },
            children: "Paste competitor product URLs to track them directly.",
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsPanel, {
            value: "search",
            style: { padding: 16, color: "var(--color-foreground)" },
            children: "Search by brand name to discover competing listings.",
          }),
        ],
      }),
    });
  return __toCommonJS(Tabs_exports);
})();
