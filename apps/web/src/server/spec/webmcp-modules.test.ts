import { describe, expect, test } from "bun:test";
import { SCRIPT_LIMIT_BYTES } from "@/server/utils/webmcp-limits";
import { discoverModules } from "@/server/utils/webmcp-modules";

const SOURCE = "https://cdn.example/assets/entry.js";
const DOCUMENT = "https://shop.example/store/";
const discover = (source: string) => discoverModules(source, SOURCE, DOCUMENT);

describe("WebMCP executable module discovery", () => {
  test("resolves static imports, re-exports and literal dynamic imports against the module URL", () => {
    const report = discover(`
      import './tools.js#version';
      export {search} from '../shared/search.js';
      export * from '/shared/adapter.js';
      void import('https://other.example/lazy.js');
      void import('./tools.js#duplicate');`);
    expect(report).toEqual({
      urls: [
        "https://cdn.example/assets/tools.js",
        "https://cdn.example/shared/search.js",
        "https://cdn.example/shared/adapter.js",
        "https://other.example/lazy.js",
      ],
      incomplete: false,
    });
  });

  test("resolves created script URLs against the document base, including setAttribute", () => {
    const report = discover(`
      const first = document.createElement('script');
      first.src = './adapter.js';
      const second = window.document.createElement('script');
      second.setAttribute('src', '../shared/tools.js');
      const third = globalThis.document.createElement('SCRIPT');
      third['src'] = '/root-module.js';`);
    expect(report).toEqual({
      urls: [
        "https://shop.example/store/adapter.js",
        "https://shop.example/shared/tools.js",
        "https://shop.example/root-module.js",
      ],
      incomplete: false,
    });
  });

  test("follows a Shopify-style loader's literal argument through defaults and nested closures", () => {
    const report = discover(`
      (() => {
        function load(source, integrity, {win: browser = window, doc: page = document} = {}) {
          function append() {
            const script = page.createElement('script');
            script.type = 'module';
            script.src = source;
            page.head.appendChild(script);
          }
          function ready() {browser.setTimeout(append, 0);}
          ready();
        }
        load('https://cdn.shopify.com/storefront/webmcp/webmcp-0.1.1.js', '');
      })();`);
    expect(report.urls).toEqual([
      "https://cdn.shopify.com/storefront/webmcp/webmcp-0.1.1.js",
    ]);
  });

  test("passes a literal through a helper into a callback without executing it", () => {
    const report = discover(`
      function install(source) {
        queue(() => {
          const script = document.createElement('script');
          script.src = source;
          throw new Error('This callback must never run');
        });
      }
      install('/deferred.js');`);
    expect(report.urls).toEqual(["https://shop.example/deferred.js"]);
  });

  test("excludes arbitrary strings, comments, image sources and fetch requests", () => {
    const report = discover(`
      const documentation = "import('./example.js')";
      // import('./comment.js')
      const url = 'https://cdn.example/unrelated.js';
      fetch('https://api.example/data.js');
      const image = document.createElement('img');
      image.src = '/photo.js';
      image.setAttribute('src', '/other-photo.js');
      const custom = {src: '/data.js'};`);
    expect(report).toEqual({ urls: [], incomplete: false });
  });

  test("does not promote shadowed document or window parameters into browser globals", () => {
    const report = discover(`
      function custom(document) {
        const script = document.createElement('script');
        script.src = '/custom.js';
      }
      function other(window) {
        const script = window.document.createElement('script');
        script.src = '/other.js';
      }
      custom(customDocument);
      other(customWindow);
      { const document = unrelated; document.createElement('script').src = '/local.js'; }`);
    expect(report.urls).toEqual([]);
  });

  test("imported document bindings stay distinct from the browser document", () => {
    const report = discover(`
      import document from './document.js';
      const script = document.createElement('script');
      script.src = 'https://incorrect.example/not-a-browser-script.js';`);
    expect(report.urls).toEqual(["https://cdn.example/assets/document.js"]);
  });

  test("unknown spread options cannot trigger a supposedly absent document default", () => {
    const report = discover(`
      function load(source, {doc: page = document} = {}) {
        const script = page.createElement('script');
        script.src = source;
      }
      load('/unknown-document.js', {...runtimeOptions});
      load('/overwritten-document.js', {doc: document, ...runtimeOptions});`);
    expect(report.urls).toEqual([]);
    expect(report.incomplete).toBe(true);
  });

  test("an explicit document after unknown spread options restores a known owner", () => {
    const report = discover(`
      function load(source, {doc: page = document} = {}) {
        const script = page.createElement('script');
        script.src = source;
      }
      load('/known-document.js', {...runtimeOptions, doc: document});`);
    expect(report.urls).toEqual(["https://shop.example/known-document.js"]);
  });

  test("unknown accessors, computed properties and mutated aliases do not establish browser ownership", () => {
    const report = discover(`
      function load(source, {doc: page = document} = {}) {
        const script = page.createElement('script');
        script.src = source;
      }
      load('/getter.js', {get doc(){return document;}});
      load('/computed.js', {[unknownKey]: customDocument});
      const options = {doc: document};
      const alias = options;
      alias.doc = {};
      load('/mutated.js', options);`);
    expect(report.urls).toEqual([]);
    expect(report.incomplete).toBe(true);
  });

  test("a nested var declaration shadows document throughout its enclosing function", () => {
    const report = discover(`
      function load() {
        const script = document.createElement('script');
        script.src = '/shadowed.js';
        if (enabled) {var document = customDocument;}
      }
      load();`);
    expect(report.urls).toEqual([]);
  });

  test("compound source assignment does not turn its suffix into a separate script URL", () => {
    const report = discover(`
      const script = document.createElement('script');
      script.src = '/initial.js';
      script.src += '/append.js';`);
    expect(report.urls).toEqual(["https://shop.example/initial.js"]);
    expect(report.incomplete).toBe(true);
  });

  test("does not keep a script classification after the variable is reassigned", () => {
    const report = discover(`
      let element = document.createElement('script');
      element = document.createElement('img');
      element.src = '/image.js';`);
    expect(report.urls).toEqual([]);
  });

  test("reports unresolved imports and import-map-dependent specifiers as incomplete", () => {
    const report = discover(`
      import 'package-needing-an-import-map';
      void import(runtimeModuleUrl);
      void import('./known.js');`);
    expect(report).toEqual({
      urls: ["https://cdn.example/assets/known.js"],
      incomplete: true,
    });
  });

  test("rejects unsupported URL schemes and credential-bearing references", () => {
    const report = discover(`
      import 'data:text/javascript,alert(1)';
      import 'https://user:password@cdn.example/secret.js';
      const script = document.createElement('script');
      script.src = 'javascript:alert(1)';
      script.src = 'file:///tmp/local.js';`);
    expect(report.urls).toEqual([]);
  });

  test("terminates recursive loader cycles and retains independently discoverable imports", () => {
    const report = discover(`
      function first(source) {second(source);}
      function second(source) {first(source);}
      first('/recursive.js');
      import './independent.js';`);
    expect(report.urls).toEqual(["https://cdn.example/assets/independent.js"]);
  }, 2000);

  test("reports inspection depth, work and resource-count limits without hanging", () => {
    expect(
      discover(`${"{".repeat(70)}import('./deep.js');${"}".repeat(70)}`)
        .incomplete,
    ).toBe(true);
    const wide = Array.from(
      { length: 15000 },
      (_, index) => `const value${index} = 'unrelated';`,
    ).join("\n");
    expect(discover(wide).incomplete).toBe(true);
    const imports = Array.from(
      { length: 70 },
      (_, index) => `import './module${index}.js';`,
    ).join("\n");
    const report = discover(imports);
    expect(report.urls.length).toBeLessThan(70);
    expect(report.incomplete).toBe(true);
  }, 2000);

  test("rejects malformed and oversized UTF-8 source with explicit incomplete coverage", () => {
    expect(discover("import('")).toEqual({ urls: [], incomplete: true });
    expect(discover("é".repeat(SCRIPT_LIMIT_BYTES / 2 + 1))).toEqual({
      urls: [],
      incomplete: true,
    });
  });
});
