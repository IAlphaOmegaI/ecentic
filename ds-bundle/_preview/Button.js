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

  // .design-sync/previews/Button.tsx
  var Button_exports = {};
  __export(Button_exports, {
    Colors: () => Colors,
    Disabled: () => Disabled,
    Soft: () => Soft,
    Variants: () => Variants,
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

  // .design-sync/previews/Button.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Row = ({ children }) =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
      style: {
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      },
      children,
    });
  var Variants = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "default",
          color: "primary",
          children: "Run simulation",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "soft",
          color: "primary",
          children: "Optimize listing",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "outline",
          color: "primary",
          children: "View report",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "ghost",
          color: "primary",
          children: "Cancel",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "flat",
          color: "primary",
          children: "Add competitor",
        }),
      ],
    });
  var Colors = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "primary",
          children: "Primary",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "secondary",
          children: "Secondary",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "success",
          children: "Success",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "warning",
          children: "Warning",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "error",
          children: "Error",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "info",
          children: "Info",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          color: "neutral",
          children: "Neutral",
        }),
      ],
    });
  var Soft = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "soft",
          color: "primary",
          children: "Winning",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "soft",
          color: "success",
          children: "Approved",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "soft",
          color: "warning",
          children: "At risk",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "soft",
          color: "error",
          children: "Losing",
        }),
      ],
    });
  var Disabled = () =>
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          disabled: true,
          children: "Add to Cart — $139",
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, {
          variant: "soft",
          color: "primary",
          disabled: true,
          children: "Processing…",
        }),
      ],
    });
  return __toCommonJS(Button_exports);
})();
