/** Source evidence only: none of these findings imply a tool ran in a browser. */
export type Tool = {
  name: string | null;
  description: string | null;
  kind: "declarative" | "imperative";
  sourceUrl: string;
  pageUrl: string;
  /** Distinguishes source registration sites without implying runtime execution. */
  registrationId?: string;
  inputNames: string[];
  parameters: {
    name: string;
    type: string | null;
    description: string | null;
    required: boolean | null;
  }[];
  schemaState: "absent" | "resolved" | "unresolved" | "notApplicable";
  execution: "declared" | "missing" | "unresolved" | "form";
  issues: (
    | "missingName"
    | "missingDescription"
    | "missingSchema"
    | "autoSubmit"
    | "unresolvedDefinition"
  )[];
};

/** Public form metadata only; never include field values, tokens or credentials. */
export type FormEvidence = {
  id: string;
  pageUrl: string;
  selector: string;
  label: string | null;
  action: string | null;
  method: "get" | "post" | "dialog";
  declared: boolean;
  toolName: string | null;
  sensitive: boolean;
  autoSubmit: boolean;
  fields: {
    name: string | null;
    type: string;
    description: string | null;
    required: boolean;
  }[];
};

export type FormIntent =
  | "search"
  | "product"
  | "variant"
  | "cart"
  | "coupon"
  | "shipping"
  | "checkout"
  | "orderTracking"
  | "returns"
  | "newsletter"
  | "contact"
  | "account"
  | "other";

export type StoreWorkflow =
  | "catalogSearch"
  | "productDetails"
  | "variants"
  | "cartRead"
  | "cartUpdate"
  | "checkout"
  | "policies"
  | "orders";

export type StoreCoverage = {
  context: "storefront" | "unconfirmed";
  signals: {
    kind: "productPage" | "catalogPage" | "cartForm" | "commerceTool";
    url: string;
  }[];
  workflows: {
    id: StoreWorkflow;
    status: "toolFound" | "formOnly" | "notObserved" | "review";
    tools: { name: string; sourceUrl: string; pageUrl: string }[];
    formIds: string[];
  }[];
};

export type AuditCode =
  | "missingToolName"
  | "missingToolDescription"
  | "missingHandler"
  | "unresolvedDefinition"
  | "briefDescription"
  | "missingParameterDescriptions"
  | "duplicateToolName"
  | "automaticSubmission"
  | "unnamedFields"
  | "formOpportunity"
  | "formReview"
  | "incompleteCoverage"
  | "noToolEvidence"
  | "runtimeUnverified";

export type AuditFinding = {
  id: string;
  code: AuditCode;
  priority: "high" | "medium" | "low" | "opportunity" | "info";
  /** A developer can identify the exact source without inferred runtime claims. */
  pageUrl: string;
  sourceUrl: string;
  subject: string | null;
  evidence: string[];
  relatedTools: string[];
  formId: string | null;
  formIntent: FormIntent | null;
  occurrences: { formId: string; pageUrl: string; selector: string }[];
  snippet: string | null;
};

export type AuditCheck = {
  id:
    | "discovery"
    | "metadata"
    | "parameters"
    | "implementation"
    | "forms"
    | "coverage"
    | "runtime";
  status: "pass" | "attention" | "unknown";
  findings: number;
};

export type Audit = {
  commerce: StoreCoverage;
  checks: AuditCheck[];
  findings: AuditFinding[];
  summary: {
    high: number;
    improvements: number;
    opportunities: number;
    passed: number;
    unknown: number;
  };
};

export type Signal = {
  kind: "context-api" | "register-tool" | "provide-context";
  sourceUrl: string;
  pageUrl: string;
};

export type Report = {
  url: string;
  scannedAt: string;
  status: "markup-found" | "script-signals" | "no-evidence";
  coverage: {
    pages: number;
    scripts: number;
    skippedScripts: number;
    failedResources: number;
  };
  pages: {
    url: string;
    status: "scanned" | "unavailable";
    httpStatus: number | null;
  }[];
  tools: Tool[];
  forms: FormEvidence[];
  audit: Audit;
  signals: Signal[];
  limitations: (
    | "staticOnly"
    | "pageLimit"
    | "scriptLimit"
    | "resourceFailures"
    | "parseFailures"
  )[];
};

export type Outcome =
  | { kind: "complete"; report: Report }
  | {
      kind: "invalid" | "unreachable" | "tooLarge" | "limited";
      retryAfter?: number;
    };
