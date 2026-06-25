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

  // .design-sync/previews/Autocomplete.tsx
  var Autocomplete_exports = {};
  __export(Autocomplete_exports, {
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

  // .design-sync/previews/Autocomplete.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var inputStyle = {
    width: 320,
    background: "var(--color-background)",
    borderColor: "var(--color-accent-foreground)",
    color: "var(--color-foreground)",
  };
  var popupStyle = {
    width: 320,
    background: "var(--color-background-rich)",
    borderRadius: 8,
    outline: "none",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
    color: "var(--color-foreground)",
  };
  var itemStyle = { color: "var(--color-foreground)" };
  var queries = [
    "best wireless earbuds under $150",
    "noise cancelling earbuds for travel",
    "earbuds with longest battery life",
    "waterproof earbuds for running",
    "earbuds compatible with USB-C",
  ];
  var grouped = [
    {
      value: "Products",
      items: [
        "Wireless Earbuds Pro",
        "Wireless Earbuds Lite",
        "Over-Ear Headphones",
      ],
    },
    {
      value: "Competitors",
      items: ["Anker Soundcore", "Bose QuietComfort", "Sony WF-1000XM5"],
    },
  ];
  var Open = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 320 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Autocomplete,
        {
          items: queries,
          defaultValue: "earbuds",
          defaultOpen: true,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.AutocompleteInput,
              { placeholder: "What would a shopper ask?", style: inputStyle },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.AutocompletePositioner,
              {
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  ds_exports.AutocompletePopup,
                  {
                    style: popupStyle,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.AutocompleteEmpty,
                        { children: "No suggestions" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.AutocompleteList,
                        {
                          children: (item) =>
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              ds_exports.AutocompleteItem,
                              { value: item, style: itemStyle, children: item },
                              item,
                            ),
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
  var Grouped = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 320 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Autocomplete,
        {
          items: grouped,
          defaultOpen: true,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.AutocompleteInput,
              {
                placeholder: "Search catalog & competitors",
                style: inputStyle,
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.AutocompletePositioner,
              {
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  ds_exports.AutocompletePopup,
                  {
                    style: popupStyle,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.AutocompleteEmpty,
                        { children: "No matches" },
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        ds_exports.AutocompleteList,
                        {
                          children: (group) =>
                            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                              ds_exports.AutocompleteGroup,
                              {
                                items: group.items,
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                    ds_exports.AutocompleteGroupLabel,
                                    {
                                      style: {
                                        background:
                                          "var(--color-background-rich)",
                                        color: "var(--color-foreground-dimmed)",
                                      },
                                      children: group.value,
                                    },
                                  ),
                                  group.items.map((item) =>
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                      ds_exports.AutocompleteItem,
                                      {
                                        value: item,
                                        style: itemStyle,
                                        children: item,
                                      },
                                      item,
                                    ),
                                  ),
                                ],
                              },
                              group.value,
                            ),
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
      style: { width: 320 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Autocomplete,
        {
          items: queries,
          defaultValue: "noise cancelling",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.AutocompleteInput,
              { placeholder: "What would a shopper ask?", style: inputStyle },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.AutocompletePositioner,
              {
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  ds_exports.AutocompletePopup,
                  {
                    style: popupStyle,
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      ds_exports.AutocompleteList,
                      {
                        children: (item) =>
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            ds_exports.AutocompleteItem,
                            { value: item, style: itemStyle, children: item },
                            item,
                          ),
                      },
                    ),
                  },
                ),
              },
            ),
          ],
        },
      ),
    });
  return __toCommonJS(Autocomplete_exports);
})();
