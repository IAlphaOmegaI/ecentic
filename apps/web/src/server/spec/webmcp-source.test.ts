import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  HTML_LIMIT_BYTES,
  SCRIPT_LIMIT_BYTES,
} from "@/server/utils/webmcp-limits";
import { inspectHtml, inspectScript } from "@/server/utils/webmcp-source";

const PAGE = "https://store.example/shop/";
const SCRIPT = "https://cdn.example/tools.js";
const inspect = (source: string) => inspectScript(source, SCRIPT, PAGE);

describe("WebMCP declarative source inspection", () => {
  test("extracts real form metadata and decoded fields without running or submitting anything", () => {
    const report = inspectHtml(
      `
      <form toolname="search_products" tooldescription="Search bags &amp; accessories" action="/purchase" method="post">
        <input name="query"><select name="category"><option>Bags</option></select>
        <textarea name="notes"></textarea>
        <input name="query"><input name="submit" type="submit">
      </form>`,
      PAGE,
    );
    expect(report.tools).toEqual([
      {
        name: "search_products",
        description: "Search bags & accessories",
        kind: "declarative",
        sourceUrl: PAGE,
        pageUrl: PAGE,
        registrationId: `${PAGE}#form-1`,
        inputNames: ["query", "category", "notes"],
        parameters: [
          { name: "query", type: "text", description: null, required: false },
          {
            name: "category",
            type: "select-one",
            description: null,
            required: false,
          },
          {
            name: "notes",
            type: "textarea",
            description: null,
            required: false,
          },
        ],
        schemaState: "notApplicable",
        execution: "form",
        issues: [],
      },
    ]);
    expect(report.parseFailures).toBe(0);
  });

  test("follows external form ownership, disabled fieldsets and their first-legend exception", () => {
    const report = inspectHtml(
      `
      <input name="outside" form="search">
      <form id="search" toolname="search" tooldescription="Find products">
        <input name="enabled"><input name="disabled" disabled><input name="readOnly" readonly>
        <fieldset disabled>
          <legend><input name="legendField"></legend>
          <input name="fieldsetDisabled">
          <legend><input name="secondLegendDisabled"></legend>
        </fieldset>
        <input name="elsewhere" form="other">
        <input name="hiddenToken" type="hidden">
        <input name="hiddenContext" type="hidden" toolparamdescription="Search context">
        <input name="color" type="radio"><input name="color" type="radio">
      </form><form id="other"></form>`,
      PAGE,
    );
    expect(report.tools[0]?.inputNames).toEqual([
      "outside",
      "enabled",
      "legendField",
      "hiddenContext",
      "color",
    ]);
  });

  test("captures public annotated and plain form structure with labels and external controls", () => {
    const report = inspectHtml(
      `
      <base href="/assets/">
      <label for="query">Product search</label><input id="query" name="query" type="search" required form="search:form">
      <form id="search:form" aria-label="Find products" action="../search?session=private" method="GET"
        toolname="search" tooldescription="Search available products">
        <input name="category" toolparamdescription="Category to search">
        <input aria-label="Optional note">
        <input name="disabled" disabled>
      </form>
      <form id="newsletter" action="subscribe?token=private" method="post">
        <label>Email address<input name="email" type="email" required value="PRIVATE_EMAIL"></label>
      </form>`,
      PAGE,
    );
    expect(report.forms).toEqual([
      {
        id: `${PAGE}#form-1`,
        pageUrl: PAGE,
        selector: "#search\\3a form",
        label: "Find products",
        action: "https://store.example/search",
        method: "get",
        declared: true,
        autoSubmit: false,
        toolName: "search",
        sensitive: false,
        fields: [
          {
            name: "query",
            type: "search",
            description: "Product search",
            required: true,
          },
          {
            name: "category",
            type: "text",
            description: "Category to search",
            required: false,
          },
          {
            name: null,
            type: "text",
            description: "Optional note",
            required: false,
          },
        ],
      },
      {
        id: `${PAGE}#form-2`,
        pageUrl: PAGE,
        selector: "#newsletter",
        label: "newsletter",
        action: "https://store.example/assets/subscribe",
        method: "post",
        declared: false,
        autoSubmit: false,
        toolName: null,
        sensitive: false,
        fields: [
          {
            name: "email",
            type: "email",
            description: "Email address",
            required: true,
          },
        ],
      },
    ]);
    expect(report.tools[0]).toMatchObject({
      schemaState: "notApplicable",
      execution: "form",
      parameters: [
        {
          name: "query",
          type: "search",
          description: "Product search",
          required: true,
        },
        {
          name: "category",
          type: "text",
          description: "Category to search",
          required: false,
        },
      ],
    });
    expect(JSON.stringify(report.forms)).not.toContain("PRIVATE_EMAIL");
    expect(JSON.stringify(report.forms)).not.toContain("private");
  });

  test("excludes hidden and inert public form fields and never returns credentials or field values", () => {
    const report = inspectHtml(
      `
      <form id="account" action="https://user:PRIVATE_CREDENTIAL@store.example/account?token=PRIVATE_TOKEN#PRIVATE_HASH">
        <label>Password<input name="password" type="password" value="PRIVATE_PASSWORD" required></label>
        <input type="hidden" name="csrf_token" value="PRIVATE_CSRF">
        <input type="hidden" name="context" toolparamdescription="Internal context" value="PRIVATE_CONTEXT">
        <input name="hiddenAttribute" hidden value="PRIVATE_HIDDEN">
        <div inert><input name="inertField" value="PRIVATE_INERT"></div>
        <label>Note<textarea name="note">PRIVATE_TEXTAREA</textarea></label>
        <input name="readonlyField" readonly value="PRIVATE_READONLY">
      </form>
      <div hidden><form id="hidden"><input name="hiddenForm"></form></div>
      <form inert id="inert"><input name="inertForm"></form>
      <template><form><input name="templateForm"></form></template>`,
      PAGE,
    );
    expect(report.forms).toHaveLength(1);
    expect(report.forms[0]).toMatchObject({
      action: "https://store.example/account",
      sensitive: true,
      fields: [
        {
          name: "password",
          type: "password",
          description: "Password",
          required: true,
        },
        {
          name: "note",
          type: "textarea",
          description: "Note",
          required: false,
        },
      ],
    });
    expect(JSON.stringify(report.forms)).not.toContain("PRIVATE_");
    expect(JSON.stringify(report.forms)).not.toContain("csrf_token");
    expect(JSON.stringify(report.forms)).not.toContain("context");
  });

  test("uses distinct structural selectors for duplicate or missing form ids", () => {
    const report = inspectHtml(
      '<section><form id="duplicate"></form><form id="duplicate"></form></section><form></form>',
      PAGE,
    );
    expect(new Set(report.forms.map(({ selector }) => selector)).size).toBe(3);
    expect(
      report.forms.every(({ selector }) =>
        selector.includes("form:nth-of-type("),
      ),
    ).toBe(true);
    expect(report.forms.map(({ id }) => id)).toEqual([
      `${PAGE}#form-1`,
      `${PAGE}#form-2`,
      `${PAGE}#form-3`,
    ]);
    const escaped = inspectHtml(
      '<form id="123"></form><form id="-"></form>',
      PAGE,
    );
    expect(escaped.forms.map(({ selector }) => selector)).toEqual([
      "#\\31 23",
      "#\\2d ",
    ]);
  });

  test("keeps form and field evidence bounded and returns forms on early exits", () => {
    const fields = Array.from(
      { length: 110 },
      (_, index) => `<input name="field${index}">`,
    ).join("");
    const report = inspectHtml(
      `<form>${fields}</form>${"<form></form>".repeat(110)}`,
      PAGE,
    );
    expect(report.forms).toHaveLength(100);
    expect(report.forms[0]?.fields).toHaveLength(100);
    expect(report.parseFailures).toBeGreaterThan(0);
    expect(inspectHtml(" ".repeat(HTML_LIMIT_BYTES + 1), PAGE).forms).toEqual(
      [],
    );
  });

  test("keeps incomplete declarations and auto-submit as explicit source hints", () => {
    const report = inspectHtml(
      `
      <form toolname="lookup" toolautosubmit></form>
      <form tooldescription="Search" toolname=" "></form>
      <div toolname="pretend" tooldescription="Not a form"></div>`,
      PAGE,
    );
    expect(report.tools).toHaveLength(2);
    expect(report.tools[0]?.issues).toEqual([
      "missingDescription",
      "autoSubmit",
    ]);
    expect(report.tools[1]?.issues).toEqual(["missingName"]);
  });

  test("retains automatic submission on a form before tool naming activates it", () => {
    const report = inspectHtml(
      '<form action="/cart/add" method="post" toolautosubmit><input name="id"></form>',
      PAGE,
    );
    expect(report.tools).toEqual([]);
    expect(report.forms[0]).toMatchObject({
      declared: false,
      toolName: null,
      autoSubmit: true,
      method: "post",
    });
  });

  test("preserves distinct form and inline-script registration locations", () => {
    const declaration =
      '<form toolname="search" tooldescription="Search products"></form>';
    const script =
      '<script>document.modelContext.registerTool({name:"search",description:"Search products",execute(){}});</script>';
    const report = inspectHtml(
      `${declaration}${declaration}${script}${script}`,
      PAGE,
    );
    expect(report.tools).toHaveLength(4);
    expect(
      new Set(report.tools.map(({ registrationId }) => registrationId)).size,
    ).toBe(4);
    expect(
      inspectHtml(
        `${declaration}${declaration}${script}${script}`,
        PAGE,
      ).tools.map(({ registrationId }) => registrationId),
    ).toEqual(report.tools.map(({ registrationId }) => registrationId));
  });

  test("does not detect comments, escaped examples, JSON, templates or noscript fallbacks", () => {
    const report = inspectHtml(
      `
      <!-- <form toolname="comment" tooldescription="example"></form> -->
      <pre>&lt;form toolname="escaped" tooldescription="example"&gt;</pre>
      <script type="application/ld+json">{"example":"document.modelContext.registerTool({name:'fake'})"}</script>
      <script type="text/template">document.modelContext.registerTool({name:'template'});</script>
      <template><form toolname="template" tooldescription="not active"></form><script src="/template.js"></script></template>
      <noscript><form toolname="fallback" tooldescription="not active"></form></noscript>
      <script nomodule>document.modelContext.registerTool({name:'old-browser'});</script>`,
      PAGE,
    );
    expect(report.tools).toEqual([]);
    expect(report.signals).toEqual([]);
    expect(report.scripts).toEqual([]);
  });

  test("resolves executable scripts and storefront links using the first base URL", () => {
    const report = inspectHtml(
      `
      <base href="/assets/"><base href="https://ignored.example/">
      <script src="./tools.js"></script>
      <script type="module" src="//cdn.example/webmcp.js"></script>
      <script src="/with-source.js">document.modelContext.registerTool({name:'ignored'});</script>
      <script type="application/json" src="/data.json"></script>
      <script>if (document.modelContext) console.log('supported');</script>
      <a href="../products/bag#details">Bag</a><a href="/collections/all">All</a>
      <a href="/search?q=bag">Search</a><a href="/account">Account</a>
      <a href="/catalog">Catalog</a>
      <a href="https://outside.example/products/bag">Outside</a>
      <a href="javascript:alert(1)">Unsafe</a>`,
      PAGE,
    );
    expect(report.scripts.map(({ url }) => url)).toEqual([
      "https://store.example/assets/tools.js",
      "https://cdn.example/webmcp.js",
      "https://store.example/with-source.js",
      null,
    ]);
    expect(report.tools).toEqual([]);
    expect(report.signals.map(({ kind }) => kind)).toEqual(["context-api"]);
    expect(report.links).toEqual([
      "https://store.example/products/bag",
      "https://store.example/collections/all",
      "https://store.example/search?q=bag",
      "https://store.example/catalog",
    ]);
  });

  test("does not combine variable scope across independent inline script blocks", () => {
    const report = inspectHtml(
      `<script>const context = document.modelContext;</script>
      <script>context.registerTool({name:'unknown-cross-script', description:'Unknown'});</script>`,
      PAGE,
    );
    expect(report.tools).toEqual([]);
    expect(report.signals.map(({ kind }) => kind)).toEqual(["context-api"]);
  });

  test("reports oversized and malformed sources as incomplete inspection", () => {
    expect(
      inspectHtml(" ".repeat(HTML_LIMIT_BYTES + 1), PAGE).parseFailures,
    ).toBe(1);
    expect(
      inspectHtml("<script>const broken = {;</script>", PAGE).parseFailures,
    ).toBeGreaterThan(0);
    expect(
      inspectHtml('<form toolname="broken" toolname="duplicate"></form>', PAGE)
        .parseFailures,
    ).toBeGreaterThan(0);
  });

  test("finds declarations after large storefront data near the end of an accepted document", () => {
    const html = `<script type="application/json">{"catalog":"${"x".repeat(4 * 1024 * 1024)}"}</script>
      <form toolname="late_search" tooldescription="Search products"><input name="query"></form>
      <script>document.modelContext.registerTool({name:'late_cart',description:'Read cart',execute(){}});</script>`;
    const report = inspectHtml(html, PAGE);
    expect(Buffer.byteLength(html, "utf8")).toBeGreaterThan(4 * 1024 * 1024);
    expect(report.tools.map(({ name }) => name)).toEqual([
      "late_search",
      "late_cart",
    ]);
    expect(report.tools[0]?.inputNames).toEqual(["query"]);
    expect(report.scripts).toHaveLength(1);
    expect(report.parseFailures).toBe(0);
  });

  test("applies the HTML bound to UTF-8 bytes, including multibyte source", () => {
    const html = "é".repeat(HTML_LIMIT_BYTES / 2 + 1);
    expect(html.length).toBeLessThan(HTML_LIMIT_BYTES);
    expect(inspectHtml(html, PAGE)).toMatchObject({
      tools: [],
      signals: [],
      parseFailures: 1,
    });
  });

  test("bounds disabled-fieldset and form ownership lookup on large documents", () => {
    const forms = Array.from(
      { length: 100 },
      (_, index) =>
        `<form toolname="form${index}" tooldescription="Form"></form>`,
    ).join("");
    const controls = '<input name="disabled">'.repeat(20000);
    const report = inspectHtml(
      `${forms}<fieldset disabled>${controls}</fieldset>`,
      PAGE,
    );
    expect(report.tools).toHaveLength(100);
    expect(
      report.tools.every(({ inputNames }) => inputNames.length === 0),
    ).toBe(true);
  }, 2000);
});

describe("WebMCP imperative source inspection", () => {
  test("extracts current and legacy API registrations with static schema inputs", () => {
    const report = inspect(`
      document.modelContext.registerTool({
        name: 'search_products', description: 'Search the catalog',
        inputSchema: {type:'object', properties: {query: {type:'string'}, maxPrice:{type:'number'}}},
        execute: () => { throw new Error('must never execute'); }
      });
      navigator.modelContext.registerTool({name:'cart',description:'Read cart',execute:() => ({})});`);
    expect(
      report.tools.map(({ name, inputNames, issues }) => ({
        name,
        inputNames,
        issues,
      })),
    ).toEqual([
      {
        name: "search_products",
        inputNames: ["query", "maxPrice"],
        issues: [],
      },
      { name: "cart", inputNames: [], issues: [] },
    ]);
    expect(report.signals.map(({ kind }) => kind).sort()).toEqual([
      "context-api",
      "register-tool",
    ]);
    expect(
      report.tools.every(
        ({ sourceUrl, pageUrl }) => sourceUrl === SCRIPT && pageUrl === PAGE,
      ),
    ).toBe(true);
    expect(report.parseFailures).toBe(0);
  });

  test("handles the actual deployed alias, tool array and fallback registration patterns", () => {
    const source = readFileSync(
      new URL("../../../public/webmcp.js", import.meta.url),
      "utf8",
    );
    const report = inspect(source);
    expect(report.parseFailures).toBe(0);
    expect([...new Set(report.tools.map(({ name }) => name))]).toEqual([
      "get_site_overview",
      "navigate_to_page",
      "open_ucp_validator",
      "open_ucp_playground",
      "start_sign_up",
    ]);
    expect(report.tools).toHaveLength(10);
    expect(
      new Set(report.tools.map(({ registrationId }) => registrationId)).size,
    ).toBe(2);
    expect(
      report.tools.find(({ name }) => name === "navigate_to_page")?.inputNames,
    ).toEqual(["page"]);
    expect(report.signals.map(({ kind }) => kind).sort()).toEqual([
      "context-api",
      "provide-context",
      "register-tool",
    ]);
  });

  test("resolves object metadata, array spreads and provideContext aliases", () => {
    const report = inspect(`
      const {modelContext: context} = document;
      const name = 'find'; const description = 'Find a product';
      const inputSchema = {type:'object',properties:{query:{type:'string'}}};
      const tool = {name, description, inputSchema, execute() {}};
      const tools = [tool]; const configuration = {tools:[...tools]};
      context.provideContext(configuration);`);
    expect(report.tools[0]).toMatchObject({
      name: "find",
      description: "Find a product",
      inputNames: ["query"],
      issues: [],
    });
    expect(report.tools).toHaveLength(1);
  });

  test("traces a module definition table through mapping, context helpers and registration wrappers", () => {
    // Mirrors a bundled adapter's data flow without copying its product-specific tools.
    const report = inspect(`
      (() => {
        const definitions = {
          search: {name:'find_items', description:'Find matching items', inputSchema:{type:'object',properties:{query:{type:'string'}}}},
          cart: {name:'read_basket', description:'Read basket contents', inputSchema:{type:'object',properties:{}}}
        };
        const unused = {name:'unregistered', description:'Not connected to registration'};
        const implementations = {find_items: () => {}, read_basket: () => {}};
        const tools = Object.values(definitions).map(definition => ({...definition,execute:implementations[definition.name]}));
        function context() {
          return typeof document !== 'undefined' && 'modelContext' in document
            ? document.modelContext ?? null
            : typeof navigator !== 'undefined' ? navigator.modelContext ?? null : null;
        }
        function wrap(tool, options) {
          const {execute, ...definition} = tool;
          return {...definition, execute: input => execute(input, options)};
        }
        function register() {
          const api = context();
          if (!api) return;
          for (const tool of tools) {
            const definition = wrap(tool, {});
            api.registerTool(definition);
          }
        }
        register();
      })();`);
    expect(
      report.tools.map(({ name, inputNames, issues }) => ({
        name,
        inputNames,
        issues,
      })),
    ).toEqual([
      { name: "find_items", inputNames: ["query"], issues: [] },
      { name: "read_basket", inputNames: [], issues: [] },
    ]);
    expect(report.parseFailures).toBe(0);
  });

  test("does not collect unrelated metadata helpers or custom registries", () => {
    const report = inspect(`
      function definition() {return {name:'unused',description:'Unregistered'};}
      function customContext() {return {registerTool(){}};}
      function shadowedContext(document) {return document.modelContext;}
      const custom = customContext();
      custom.registerTool(definition());
      const shadowed = shadowedContext({modelContext:custom});
      shadowed.registerTool(definition());
      Object.values({unused:definition()}).map(tool => ({...tool,execute(){}}));`);
    expect(report.tools).toEqual([]);
    expect(report.signals).toEqual([]);
  });

  test("keeps side-effecting and asynchronous factory results unresolved", () => {
    const report = inspect(`
      function sideEffecting() {changeSomething();return {name:'side-effect',description:'Unknown'};}
      async function asynchronous() {return {name:'promise',description:'A promise is not a tool'};}
      document.modelContext.registerTool(sideEffecting());
      document.modelContext.registerTool(asynchronous());`);
    expect(report.tools).toHaveLength(2);
    expect(report.tools[0]).toMatchObject({
      name: null,
      description: null,
      issues: ["unresolvedDefinition"],
    });
  });

  test("bounds recursive data helpers without running them", () => {
    const report = inspect(
      "function recursive(){return recursive();} document.modelContext.registerTool(recursive());",
    );
    expect(report.tools[0]?.issues).toEqual(["unresolvedDefinition"]);
    expect(report.parseFailures).toBe(1);
  }, 2000);

  test("supports optional chaining, window globals and computed literal member names", () => {
    const report = inspect(
      `window.document['modelContext']?.['registerTool']?.({name:'find',description:'Find',execute(){}});`,
    );
    expect(report.tools[0]?.name).toBe("find");
    expect(report.parseFailures).toBe(0);
  });

  test("API feature probes are signals without invented registrations", () => {
    const report = inspect(
      `if (typeof document.modelContext?.registerTool === 'function') console.log('available');`,
    );
    expect(report.tools).toEqual([]);
    expect(report.signals.map(({ kind }) => kind)).toEqual(["context-api"]);
  });

  test("detects Shopify's conditional loader through explicit browser parameter defaults", () => {
    const report = inspect(`
      (() => {
        function load(source, integrity, {win: browser = window, doc: page = document} = {}) {
          function supported() {
            return typeof (page.modelContext || browser.navigator?.modelContext)?.registerTool === 'function';
          }
          if (supported()) {
            const script = page.createElement('script');
            script.type = 'module'; script.src = source;
            page.head.appendChild(script);
          }
        }
        load('https://cdn.shopify.com/storefront/webmcp/webmcp-0.1.1.js', '');
      })();`);
    expect(report.signals.map(({ kind }) => kind)).toEqual(["context-api"]);
    expect(report.tools).toEqual([]);
    expect(report.parseFailures).toBe(0);
  });

  test("parameter defaults preserve shadowing and leave tool metadata unresolved", () => {
    const shadowed = inspect(`
      function custom(document, {doc: page = document} = {}) {
        page.modelContext.registerTool({name:'custom',description:'Custom'});
      }
      function unknown(context) {context.registerTool({name:'unknown'});}
      const {doc: page = document} = unknownOptions;
      page.modelContext.registerTool({name:'variable-default'});`);
    expect(shadowed.tools).toEqual([]);
    expect(shadowed.signals).toEqual([]);

    const metadata = inspect(`
      function register(tool = {name:'fallback',description:'Fallback'}) {
        document.modelContext.registerTool(tool);
      }`);
    expect(metadata.tools[0]).toMatchObject({
      name: null,
      description: null,
      issues: ["unresolvedDefinition"],
    });
  });

  test("ignores prose, comments, inert string contents and unrelated registerTool methods", () => {
    const report = inspect(`
      // document.modelContext.registerTool({name:'comment'})
      /* navigator.modelContext.provideContext({tools:[{name:'comment'}]}) */
      const source = "document.modelContext.registerTool({name:'string'})";
      const documentation = {modelContext: {registerTool() {}}};
      documentation.modelContext.registerTool({name:'custom',description:'Custom'});
      unrelated.registerTool({name:'unrelated',description:'Custom'});`);
    expect(report.tools).toEqual([]);
    expect(report.signals).toEqual([]);
  });

  test("keeps dynamic definitions unresolved and distinguishes missing literal metadata", () => {
    const report = inspect(`
      document.modelContext.registerTool(loadTool());
      document.modelContext.registerTool({name:dynamicName, description:'Dynamic name'});
      document.modelContext.registerTool({name:'incomplete'});
      document.modelContext.registerTool({name:'',description:' '});
      document.modelContext.provideContext({tools: dynamicTools});`);
    expect(
      report.tools.map(({ name, description, issues }) => ({
        name,
        description,
        issues,
      })),
    ).toEqual([
      { name: null, description: null, issues: ["unresolvedDefinition"] },
      {
        name: null,
        description: "Dynamic name",
        issues: ["unresolvedDefinition"],
      },
      { name: "incomplete", description: null, issues: ["missingDescription"] },
      {
        name: null,
        description: null,
        issues: ["missingName", "missingDescription"],
      },
      { name: null, description: null, issues: ["unresolvedDefinition"] },
    ]);
  });

  test("retains separate imperative registration sites while deduplicating repeated visits", () => {
    const report = inspect(`
      const tool = {name:'search',description:'Search available products',execute(){}};
      document.modelContext.registerTool(tool);
      document.modelContext.registerTool(tool);
      for (const repeated of [tool, tool]) document.modelContext.registerTool(repeated);`);
    expect(report.tools).toHaveLength(3);
    expect(
      new Set(report.tools.map(({ registrationId }) => registrationId)).size,
    ).toBe(3);
  });

  test("does not interpret optional inputSchema omission as a defect", () => {
    const report = inspect(
      "document.modelContext.registerTool({name:'cart',description:'Read cart',execute(){}})",
    );
    expect(report.tools[0]?.issues).toEqual([]);
    expect(report.tools[0]).toMatchObject({
      schemaState: "absent",
      execution: "declared",
      parameters: [],
    });
  });

  test("captures top-level parameter schema evidence and required membership", () => {
    const report = inspect(`document.modelContext.registerTool({
      name:'search',description:'Search matching catalog items',execute(){},
      inputSchema:{type:'object',required:['query'],properties:{
        query:{type:'string',description:'Words to search for'},
        maximum:{type:['number','null']},
      }},
    });`);
    expect(report.tools[0]).toMatchObject({
      schemaState: "resolved",
      execution: "declared",
      parameters: [
        {
          name: "query",
          type: "string",
          description: "Words to search for",
          required: true,
        },
        {
          name: "maximum",
          type: "number | null",
          description: null,
          required: false,
        },
      ],
    });
  });

  test("distinguishes absent handlers and schemas from unresolved definitions", () => {
    const report = inspect(`
      document.modelContext.registerTool({name:'missing',description:'Missing handler'});
      document.modelContext.registerTool({name:'nonfunction',description:'Wrong handler',execute:null});
      document.modelContext.registerTool({name:'dynamic',description:'Dynamic implementation',execute:runtimeHandler,inputSchema:runtimeSchema});
      document.modelContext.registerTool({name:'reference',description:'Referenced schema',execute(){},inputSchema:{$ref:'https://example.com/schema.json'}});
      document.modelContext.registerTool({name:'required',description:'Dynamic required list',execute(){},inputSchema:{type:'object',required:runtimeRequired,properties:{query:{type:'string'}}}});`);
    expect(
      report.tools.map(({ name, schemaState, execution }) => ({
        name,
        schemaState,
        execution,
      })),
    ).toEqual([
      { name: "missing", schemaState: "absent", execution: "missing" },
      { name: "nonfunction", schemaState: "absent", execution: "missing" },
      { name: "dynamic", schemaState: "unresolved", execution: "unresolved" },
      { name: "reference", schemaState: "unresolved", execution: "declared" },
      { name: "required", schemaState: "unresolved", execution: "declared" },
    ]);
    expect(report.tools[4]?.parameters[0]?.required).toBeNull();
  });

  test("dynamic parameter descriptions are unresolved rather than reported as known omissions", () => {
    const report =
      inspect(`document.modelContext.registerTool({name:'dynamic',description:'Dynamic field metadata',execute(){},
      inputSchema:{type:'object',properties:{query:{type:'string',description:translatedDescription}}},
    });`);
    expect(report.tools[0]).toMatchObject({
      schemaState: "unresolved",
      parameters: [
        { name: "query", type: "string", description: null, required: false },
      ],
    });
  });

  test("prevents shadowed globals and sibling aliases from contaminating scope", () => {
    const report = inspect(`
      function first() {const context = document.modelContext;}
      function second() {context.registerTool({name:'sibling'});}
      function shadow(document) {document.modelContext.registerTool({name:'shadowed'});}
      { const navigator = other; navigator.modelContext.registerTool({name:'local'}); }
      const context = document.modelContext;
      function callback(context) {context.registerTool({name:'parameter'});}
      { const context = unrelated; context.registerTool({name:'block'}); }
      context.registerTool({name:'valid',description:'Valid',execute(){}});`);
    expect(report.tools.map(({ name }) => name)).toEqual(["valid"]);
  });

  test("does not promote arbitrary fallbacks or later reassigned aliases to browser APIs", () => {
    const report = inspect(`
      const fallback = document.modelContext || unrelated;
      fallback.registerTool({name:'custom'});
      var context = document.modelContext;
      context = unrelated;
      context.registerTool({name:'reassigned'});`);
    expect(report.tools).toEqual([]);
  });

  test("unknown spreads cannot preserve possibly overwritten metadata", () => {
    const report = inspect(
      `document.modelContext.registerTool({name:'stale',description:'Stale',...dynamic});`,
    );
    expect(report.tools[0]).toMatchObject({
      name: null,
      description: null,
      issues: ["unresolvedDefinition"],
    });
  });

  test("reports parse errors and caps oversized or deeply nested source", () => {
    expect(inspect("document.modelContext.registerTool({").parseFailures).toBe(
      1,
    );
    expect(inspect(" ".repeat(SCRIPT_LIMIT_BYTES + 1)).parseFailures).toBe(1);
    expect(
      inspect(
        `${"if(true){".repeat(140)}document.modelContext;${"}".repeat(140)}`,
      ).parseFailures,
    ).toBe(1);
  });

  test("applies the JavaScript bound to UTF-8 bytes, including multibyte source", () => {
    const source = `//${"é".repeat(SCRIPT_LIMIT_BYTES / 2)}`;
    expect(source.length).toBeLessThan(SCRIPT_LIMIT_BYTES);
    expect(inspect(source)).toEqual({
      tools: [],
      signals: [],
      parseFailures: 1,
    });
  });

  test("invalidates mutated object metadata, including aliases", () => {
    const report = inspect(`
      const tool = {name:'old',description:'Old metadata'};
      const alias = tool;
      tool.name = dynamicName;
      document.modelContext.registerTool(alias);`);
    expect(report.tools[0]).toMatchObject({
      name: null,
      description: null,
      issues: ["unresolvedDefinition"],
    });
  });

  test("respects hoisted var globals and assignments from nested blocks", () => {
    const report = inspect(`
      function shadow() {
        document.modelContext.registerTool({name:'hoisted'});
        if (enabled) {var document = unrelated;}
      }
      var context = document.modelContext;
      { context = unrelated; }
      context.registerTool({name:'stale'});
      function valid() {
        if (enabled) {var local = document.modelContext;}
        local.registerTool({name:'valid',description:'Valid',execute(){}});
      }`);
    expect(report.tools.map(({ name }) => name)).toEqual(["valid"]);
  });

  test("reports unresolved dynamically generated input schemas", () => {
    const report = inspect(
      `document.modelContext.registerTool({name:'search',description:'Search',inputSchema:buildSchema()});`,
    );
    expect(report.tools[0]?.issues).toEqual(["unresolvedDefinition"]);
  });

  test("limits repeated loop traversal, even when nested loops reuse a small AST", () => {
    const source = `const items = [${Array.from({ length: 100 }, (_, index) => index).join(",")}];
      for (const first of items) for (const second of items) for (const third of items)
        for (const fourth of items) document.modelContext.registerTool({name:'loop',description:'Repeated'});`;
    const report = inspect(source);
    expect(report.parseFailures).toBe(1);
    expect(report.tools.length).toBeLessThanOrEqual(100);
  }, 2000);

  test("reports tool arrays truncated during static extraction", () => {
    const report = inspect(
      `document.modelContext.provideContext({tools:[${Array.from(
        { length: 101 },
        (_, index) => `{name:'tool${index}',description:'Tool'}`,
      ).join(",")}]});`,
    );
    expect(report.tools).toHaveLength(100);
    expect(report.parseFailures).toBe(1);
  });

  test("caps returned metadata and findings", () => {
    const report = inspect(
      Array.from(
        { length: 110 },
        (_, index) =>
          `document.modelContext.registerTool({name:'${index}-${"n".repeat(200)}',description:'${"d".repeat(1200)}'});`,
      ).join("\n"),
    );
    expect(report.tools).toHaveLength(100);
    expect(report.tools[0]?.name?.length).toBe(160);
    expect(report.tools[0]?.description?.length).toBe(1000);
    expect(report.parseFailures).toBe(1);
  });
});
