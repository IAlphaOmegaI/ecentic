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

  // .design-sync/previews/Accordion.tsx
  var Accordion_exports = {};
  __export(Accordion_exports, {
    FAQ: () => FAQ,
    MultiOpen: () => MultiOpen,
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

  // .design-sync/previews/Accordion.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var FAQ = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 460 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Accordion,
        {
          defaultValue: ["agents"],
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.AccordionItem,
              {
                value: "agents",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionTrigger,
                    { children: "How do AI agents compare my products?" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionPanel,
                    {
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            paddingBottom: 12,
                            color: "var(--color-foreground)",
                          },
                          children:
                            "We simulate GPT-4, Claude, Gemini and Perplexity shopping for your category, then score how often each agent recommends your listing over the 8 competitors we track.",
                        },
                      ),
                    },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.AccordionItem,
              {
                value: "winrate",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionTrigger,
                    { children: "What is a win rate?" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionPanel,
                    {
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            paddingBottom: 12,
                            color: "var(--color-foreground)",
                          },
                          children:
                            "The share of agent comparisons your product wins across all tracked marketplaces.",
                        },
                      ),
                    },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.AccordionItem,
              {
                value: "optimize",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionTrigger,
                    { children: "How does auto-optimize work?" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionPanel,
                    {
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            paddingBottom: 12,
                            color: "var(--color-foreground)",
                          },
                          children:
                            "We rewrite titles, specs and descriptions to match what agents cite when they pick a winner.",
                        },
                      ),
                    },
                  ),
                ],
              },
            ),
          ],
        },
      ),
    });
  var MultiOpen = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 460 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Accordion,
        {
          multiple: true,
          defaultValue: ["shopify", "feed"],
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.AccordionItem,
              {
                value: "shopify",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionTrigger,
                    { children: "Shopify" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionPanel,
                    {
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            paddingBottom: 12,
                            color: "var(--color-foreground)",
                          },
                          children:
                            "Connect via OAuth to sync your catalog automatically.",
                        },
                      ),
                    },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.AccordionItem,
              {
                value: "feed",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionTrigger,
                    { children: "Product feed (XML / JSON)" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.AccordionPanel,
                    {
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "div",
                        {
                          style: {
                            paddingBottom: 12,
                            color: "var(--color-foreground)",
                          },
                          children:
                            "Paste a Google Shopping feed URL and we detect the format for you.",
                        },
                      ),
                    },
                  ),
                ],
              },
            ),
          ],
        },
      ),
    });
  return __toCommonJS(Accordion_exports);
})();
