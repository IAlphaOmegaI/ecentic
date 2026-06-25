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

  // .design-sync/previews/Toolbar.tsx
  var Toolbar_exports = {};
  __export(Toolbar_exports, {
    ListingEditor: () => ListingEditor,
    TableActions: () => TableActions,
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

  // .design-sync/previews/Toolbar.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var ListingEditor = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: {
        width: 560,
        border: "1px solid var(--color-accent-foreground)",
        borderRadius: 8,
        padding: 6,
        background: "var(--color-background)",
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Toolbar,
        {
          style: { display: "flex", alignItems: "center" },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.ToolbarGroup,
              {
                style: { display: "flex" },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.ToolbarButton,
                    { style: { fontWeight: 700 }, children: "B" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.ToolbarButton,
                    { style: { fontStyle: "italic" }, children: "I" },
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.ToolbarButton,
                    { style: { textDecoration: "underline" }, children: "U" },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarSeparator,
              {
                style: {
                  width: 1,
                  alignSelf: "stretch",
                  margin: "4px 4px",
                  background: "var(--color-accent-foreground)",
                },
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarButton,
              { children: "AI rewrite title" },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarButton,
              { children: "Add spec" },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarSeparator,
              {
                style: {
                  width: 1,
                  alignSelf: "stretch",
                  margin: "4px 4px",
                  background: "var(--color-accent-foreground)",
                },
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarLink,
              {
                href: "#",
                style: {
                  padding: "0 12px",
                  fontSize: 14,
                  color: "var(--color-primary)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                },
                children: "Preview",
              },
            ),
          ],
        },
      ),
    });
  var TableActions = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: {
        width: 560,
        border: "1px solid var(--color-accent-foreground)",
        borderRadius: 8,
        padding: 6,
        background: "var(--color-background)",
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Toolbar,
        {
          style: { display: "flex", alignItems: "center" },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarButton,
              { children: "Run simulation" },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarButton,
              { children: "Add competitor" },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarButton,
              { children: "Export" },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.ToolbarSeparator,
              {
                style: {
                  width: 1,
                  alignSelf: "stretch",
                  margin: "4px 4px",
                  background: "var(--color-accent-foreground)",
                },
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
              style: {
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid var(--color-accent-foreground)",
                borderRadius: 6,
                padding: "0 8px",
                height: 32,
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  ds_exports.SearchIcon,
                  {
                    style: {
                      width: 14,
                      height: 14,
                      color: "var(--color-foreground-dimmed)",
                    },
                  },
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  ds_exports.ToolbarInput,
                  {
                    placeholder: "Search products",
                    style: {
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 14,
                      color: "var(--color-foreground)",
                      width: 150,
                    },
                  },
                ),
              ],
            }),
          ],
        },
      ),
    });
  return __toCommonJS(Toolbar_exports);
})();
