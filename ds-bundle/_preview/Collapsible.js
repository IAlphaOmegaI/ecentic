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

  // .design-sync/previews/Collapsible.tsx
  var Collapsible_exports = {};
  __export(Collapsible_exports, {
    Collapsed: () => Collapsed,
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

  // .design-sync/previews/Collapsible.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Open = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 360 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Collapsible,
        {
          defaultOpen: true,
          style: { width: "100%" },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.CollapsibleTrigger,
              {
                style: {
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontWeight: 500,
                  color: "var(--color-foreground)",
                },
                children: [
                  "Why Claude picked you",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.ChevronDownIcon,
                    { style: { width: 14, height: 14 } },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.CollapsiblePanel,
              {
                style: { background: "transparent" },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                  style: { padding: "8px 0", color: "var(--color-foreground)" },
                  children:
                    "Claude cited your 48-hour battery life and USB-C charging as the deciding factors over Anker PowerCore. Confidence: 0.86.",
                }),
              },
            ),
          ],
        },
      ),
    });
  var Collapsed = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: { width: 360 },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Collapsible,
        {
          style: { width: "100%" },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              ds_exports.CollapsibleTrigger,
              {
                style: {
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontWeight: 500,
                  color: "var(--color-foreground)",
                },
                children: [
                  "Show full agent transcript",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    ds_exports.ChevronDownIcon,
                    { style: { width: 14, height: 14 } },
                  ),
                ],
              },
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ds_exports.CollapsiblePanel,
              {
                style: { background: "transparent" },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
                  style: { padding: "8px 0", color: "var(--color-foreground)" },
                  children: "Full reasoning trace from all four agents.",
                }),
              },
            ),
          ],
        },
      ),
    });
  return __toCommonJS(Collapsible_exports);
})();
