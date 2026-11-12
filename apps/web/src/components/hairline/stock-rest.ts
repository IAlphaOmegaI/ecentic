import basket from "./rest/stock/basket.json";
import branches from "./rest/stock/branches.json";
import drawer from "./rest/stock/drawer.json";
import exploded from "./rest/stock/exploded.json";
import format from "./rest/stock/format.json";
import hub from "./rest/stock/hub.json";
import loupe from "./rest/stock/loupe.json";
import patch from "./rest/stock/patch.json";
import query from "./rest/stock/query.json";
import relay from "./rest/stock/relay.json";
import riffle from "./rest/stock/riffle.json";
import router from "./rest/stock/router.json";
import sieve from "./rest/stock/sieve.json";
import terminal from "./rest/stock/terminal.json";
import vault from "./rest/stock/vault.json";

/** Rest SVG captured from @lucasmarkes/hairline 0.5.1, intensity 0.5, play false. */
export const stockRestPoses = {
  basket,
  branches,
  drawer,
  exploded,
  format,
  hub,
  loupe,
  patch,
  query,
  relay,
  riffle,
  router,
  sieve,
  terminal,
  vault,
} as const;
