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

  // .design-sync/previews/Slider.tsx
  var Slider_exports = {};
  __export(Slider_exports, {
    Disabled: () => Disabled,
    PriceRange: () => PriceRange,
    Stepped: () => Stepped,
    WinRateThreshold: () => WinRateThreshold,
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

  // .design-sync/previews/Slider.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Field = ({ label, children }) =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
      style: { width: 320, display: "flex", flexDirection: "column", gap: 8 },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-foreground)",
          },
          children: label,
        }),
        children,
      ],
    });
  var WinRateThreshold = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
      label: "Min win-rate to auto-optimize — 60%",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Slider, {
        defaultValue: 60,
        min: 0,
        max: 100,
      }),
    });
  var PriceRange = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
      label: "Competitor price range — $40–$180",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Slider, {
        defaultValue: [40, 180],
        min: 0,
        max: 250,
      }),
    });
  var Stepped = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
      label: "Simulations per scan — 8",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Slider, {
        defaultValue: 8,
        min: 1,
        max: 12,
        step: 1,
      }),
    });
  var Disabled = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
      label: "Enterprise scan budget (locked)",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
        style: { display: "block", opacity: 0.5 },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          ds_exports.Slider,
          { defaultValue: 75, min: 0, max: 100, disabled: true },
        ),
      }),
    });
  return __toCommonJS(Slider_exports);
})();
