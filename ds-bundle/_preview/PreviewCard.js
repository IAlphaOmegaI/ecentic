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

  // .design-sync/previews/PreviewCard.tsx
  var PreviewCard_exports = {};
  __export(PreviewCard_exports, {
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

  // .design-sync/previews/PreviewCard.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Open = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { display: "flex", justifyContent: "center", padding: 24 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.PreviewCard,
        {
          open: true,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.PreviewCardTrigger,
              {
                render: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
                  style: {
                    color: "var(--color-primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  },
                  children: "Anker PowerCore",
                }),
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.PreviewCardPositioner,
              {
                side: "bottom",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  ds_exports.PreviewCardPopup,
                  {
                    style: {
                      background: "var(--color-background-rich)",
                      borderRadius: 8,
                      width: 260,
                      boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.PreviewCardArrow,
                        {},
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
                        style: {
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                            style: {
                              width: 40,
                              height: 40,
                              borderRadius: 6,
                              background: "var(--color-background-dimmed)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              color: "var(--color-foreground-rich)",
                            },
                            children: "A",
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                "div",
                                {
                                  style: {
                                    fontWeight: 600,
                                    color: "var(--color-foreground-rich)",
                                  },
                                  children: "Anker PowerCore 20K",
                                },
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                "div",
                                {
                                  style: {
                                    fontSize: 12,
                                    color: "var(--color-foreground-dimmed)",
                                  },
                                  children: "Top competitor · Amazon",
                                },
                              ),
                            ],
                          }),
                        ],
                      }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                        style: {
                          fontSize: 13,
                          color: "var(--color-foreground)",
                        },
                        children:
                          "$59.99 · 4.7★ (18,204 reviews). Wins 64% of GPT-4 and Perplexity comparisons against your listing this week.",
                      }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
                        style: {
                          display: "flex",
                          gap: 16,
                          fontSize: 12,
                          color: "var(--color-foreground-dimmed)",
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
                            children: [
                              "Win rate ",
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
                                style: {
                                  color: "var(--color-foreground-rich)",
                                },
                                children: "64%",
                              }),
                            ],
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
                            children: [
                              "Mentions ",
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
                                style: {
                                  color: "var(--color-foreground-rich)",
                                },
                                children: "312",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  },
                ),
              },
            ),
          ],
        },
      ),
    });
  return __toCommonJS(PreviewCard_exports);
})();
