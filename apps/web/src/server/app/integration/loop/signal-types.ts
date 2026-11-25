/** Loop data belongs to one consenting merchant and is never pooled across merchants. */
export type ReasonCategory =
  | "fit"
  | "color"
  | "material"
  | "dimensions"
  | "compatibility"
  | "contents"
  | "not_as_described"
  | "damaged"
  | "shipping"
  | "changed_mind"
  | "other";
export type FieldDiff = {
  field: string;
  before: string | null;
  after: string;
  source: "catalog" | "return_feedback" | "merchant";
};
export type SignalMetric = {
  returns: number;
  gapReturns: number;
  gapShare: number | null;
  returnedUnits: number;
  orderedUnits: null;
  returnRate: null;
  windowStart: string;
  windowEnd: string;
};
export type SignalCheck = {
  id: string;
  surface: string;
  status: string;
  prompt: string;
  answer: string | null;
  verdict: string | null;
  evidence: string | null;
  checkedAt: string | null;
};
export type SignalProposal = {
  id: string;
  revision: number;
  status: string;
  diff: FieldDiff[];
  requiresMerchantApproval: boolean;
  publishedAt: string | null;
};
export type ReturnSignal = {
  id: string;
  productId: string;
  title: string;
  attribute: string;
  direction: string | null;
  count: number;
  share: number;
  refundValue: string;
  refundEstimated: boolean;
  currency: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  comments: string[];
  attributes: string[];
  exchanges: {
    up: number;
    down: number;
    same: number;
    oneSizeUp: number;
    known: number;
  };
  checks: SignalCheck[];
  proposal: SignalProposal | null;
  measurement: {
    before: SignalMetric;
    after: SignalMetric;
    controlBefore: SignalMetric;
    controlAfter: SignalMetric;
    controlProducts: number;
    excludedControls: number;
    collecting: boolean;
  } | null;
  aiStarted: {
    returns: number;
    gapReturns: number;
    gapShare: number | null;
    returnRate: null;
    knownOrders: number;
  };
};
export type ReturnSignals = {
  connected: boolean;
  signals: ReturnSignal[];
  mappings: {
    id: string;
    reason: string;
    parentReason: string;
    category: string;
    dataFixable: boolean;
    source: string;
  }[];
  captureConfigured: boolean;
  orderedUnitsAvailable: false;
  aiAttributionCoverage: "verified_checkout_receipts_only";
};
