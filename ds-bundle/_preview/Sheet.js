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

  // .design-sync/previews/Sheet.tsx
  var Sheet_exports = {};
  __export(Sheet_exports, {
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

  // .design-sync/previews/Sheet.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Open = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Sheet, {
      defaultOpen: true,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SheetTrigger, {
          render: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            ds_exports.Button,
            { variant: "soft", color: "primary", children: "Optimize listing" },
          ),
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SheetPopup, {
          side: "right",
          style: {
            background: "var(--color-background-rich)",
            boxShadow: "-12px 0 40px rgba(0,0,0,0.25)",
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.SheetHeader,
              {
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.SheetTitle,
                    {
                      style: {
                        fontSize: 18,
                        color: "var(--color-foreground-rich)",
                      },
                      children: "Optimize: Wireless Earbuds Pro",
                    },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.SheetDescription,
                    {
                      style: { color: "var(--color-foreground)" },
                      children:
                        "AI-rewritten listing to lift your win rate against 8 competitors.",
                    },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
              style: {
                padding: "0 16px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                      style: {
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-foreground-dimmed)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      },
                      children: "Title",
                    }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                      style: { marginTop: 4, color: "var(--color-foreground)" },
                      children:
                        "Wireless Earbuds Pro — 48h Battery, Active Noise Cancelling, USB-C",
                    }),
                  ],
                }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                      style: {
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-foreground-dimmed)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      },
                      children: "Projected win rate",
                    }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
                      style: {
                        marginTop: 4,
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
                          style: {
                            fontSize: 24,
                            fontWeight: 700,
                            color: "var(--color-foreground-rich)",
                          },
                          children: "71%",
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
                          style: {
                            color: "var(--color-success)",
                            fontWeight: 600,
                          },
                          children: "+14% vs current",
                        }),
                      ],
                    }),
                  ],
                }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                  style: {
                    fontSize: 13,
                    color: "var(--color-foreground-dimmed)",
                  },
                  children:
                    "Claude and Perplexity now rank you above Anker; GPT-4 cites the battery spec as the deciding factor.",
                }),
              ],
            }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.SheetFooter,
              {
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.Button,
                    { color: "primary", children: "Apply optimization" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.SheetClose,
                    {
                      render: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.Button,
                        {
                          variant: "ghost",
                          color: "neutral",
                          children: "Discard",
                        },
                      ),
                    },
                  ),
                ],
              },
            ),
          ],
        }),
      ],
    });
  return __toCommonJS(Sheet_exports);
})();
