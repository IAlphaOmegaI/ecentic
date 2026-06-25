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

  // .design-sync/previews/Select.tsx
  var Select_exports = {};
  __export(Select_exports, {
    Closed: () => Closed,
    Grouped: () => Grouped,
    Open: () => Open,
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

  // .design-sync/previews/Select.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var popupStyle = {
    background: "var(--color-background-rich)",
    minWidth: 240,
    borderRadius: 8,
    padding: "4px 0",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  };
  var Open = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 280 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Select,
        {
          defaultValue: "claude",
          defaultOpen: true,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.SelectTrigger,
              {
                style: { width: 280 },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  ds_exports.SelectValue,
                  {},
                ),
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.SelectPositioner,
              {
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  ds_exports.SelectPopup,
                  {
                    style: popupStyle,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "gpt4", children: "GPT-4" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "claude", children: "Claude" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "gemini", children: "Gemini" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "perplexity", children: "Perplexity" },
                      ),
                    ],
                  },
                ),
              },
            ),
          ],
        },
      ),
    });
  var Grouped = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 280 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Select,
        {
          defaultValue: "shopify",
          defaultOpen: true,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.SelectTrigger,
              {
                style: { width: 280 },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  ds_exports.SelectValue,
                  {},
                ),
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.SelectPositioner,
              {
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  ds_exports.SelectPopup,
                  {
                    style: popupStyle,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                        ds_exports.SelectGroup,
                        {
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectGroupLabel,
                              {
                                style: {
                                  padding: "6px 10px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.4,
                                  color: "var(--color-foreground-dimmed)",
                                },
                                children: "Marketplaces",
                              },
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectItem,
                              { value: "shopify", children: "Shopify" },
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectItem,
                              { value: "amazon", children: "Amazon" },
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectItem,
                              { value: "woocommerce", children: "WooCommerce" },
                            ),
                          ],
                        },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectSeparator,
                        {
                          style: {
                            height: 1,
                            margin: "4px 0",
                            background: "var(--color-accent-foreground)",
                          },
                        },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                        ds_exports.SelectGroup,
                        {
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectGroupLabel,
                              {
                                style: {
                                  padding: "6px 10px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.4,
                                  color: "var(--color-foreground-dimmed)",
                                },
                                children: "Feeds",
                              },
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectItem,
                              { value: "google", children: "Google Shopping" },
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.SelectItem,
                              { value: "custom", children: "Custom XML/JSON" },
                            ),
                          ],
                        },
                      ),
                    ],
                  },
                ),
              },
            ),
          ],
        },
      ),
    });
  var Closed = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 280 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Select,
        {
          defaultValue: "weekly",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.SelectTrigger,
              {
                style: { width: 280 },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  ds_exports.SelectValue,
                  {},
                ),
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.SelectPositioner,
              {
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  ds_exports.SelectPopup,
                  {
                    style: popupStyle,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "daily", children: "Daily scan" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "weekly", children: "Weekly scan" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.SelectItem,
                        { value: "monthly", children: "Monthly scan" },
                      ),
                    ],
                  },
                ),
              },
            ),
          ],
        },
      ),
    });
  return __toCommonJS(Select_exports);
})();
