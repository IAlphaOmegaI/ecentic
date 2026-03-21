(function () {
  var UA_PATTERNS = [
    { pattern: "ChatGPT-User", type: "chatgpt-user", category: "user-action" },
    { pattern: "Claude-User", type: "claude-user", category: "user-action" },
    {
      pattern: "Perplexity-User",
      type: "perplexity-user",
      category: "user-action",
    },
    {
      pattern: "ChatGPT-Agent",
      type: "chatgpt-agent",
      category: "agentic-browser",
    },
    {
      pattern: "Comet/",
      type: "perplexity-comet",
      category: "agentic-browser",
    },
    { pattern: "GPTBot", type: "gptbot", category: "training-crawler" },
    { pattern: "ClaudeBot", type: "claudebot", category: "training-crawler" },
    {
      pattern: "OAI-SearchBot",
      type: "oai-searchbot",
      category: "search-crawler",
    },
    {
      pattern: "PerplexityBot",
      type: "perplexitybot",
      category: "search-crawler",
    },
    {
      pattern: "Claude-SearchBot",
      type: "claude-searchbot",
      category: "search-crawler",
    },
    { pattern: "Bytespider", type: "bytespider", category: "training-crawler" },
    {
      pattern: "Google-Extended",
      type: "google-extended",
      category: "training-crawler",
    },
    { pattern: "Amazonbot", type: "amazonbot", category: "training-crawler" },
    {
      pattern: "Googlebot",
      type: "googlebot",
      category: "training-crawler",
    },
  ];

  var REFERRER_DOMAINS = [
    { domain: "chat.openai.com", type: "chatgpt-referral", category: "referral" },
    { domain: "chatgpt.com", type: "chatgpt-referral", category: "referral" },
    {
      domain: "perplexity.ai",
      type: "perplexity-referral",
      category: "referral",
    },
    { domain: "claude.ai", type: "claude-referral", category: "referral" },
    {
      domain: "gemini.google.com",
      type: "gemini-referral",
      category: "referral",
    },
    {
      domain: "copilot.microsoft.com",
      type: "copilot-referral",
      category: "referral",
    },
    { domain: "you.com", type: "you-referral", category: "referral" },
  ];

  var scriptEl =
    document.currentScript ||
    (function () {
      var nodes = document.querySelectorAll('script[src*="tracker.js"]');
      return nodes.length ? nodes[nodes.length - 1] : null;
    })();

  if (!scriptEl || !scriptEl.src) return;

  var scriptUrl;
  try {
    scriptUrl = new URL(scriptEl.src);
  } catch (_) {
    return;
  }

  var storeId = scriptUrl.searchParams.get("sid");
  var token = scriptUrl.searchParams.get("k");
  var apiOrigin = scriptUrl.origin;
  var probe = scriptUrl.searchParams.get("probe") === "1";

  if (!storeId || !token) return;

  var ua = navigator.userAgent;
  var ref = document.referrer;

  var agentType = null;
  var agentCategory = null;
  var detectionMethod = null;

  for (var j = 0; j < UA_PATTERNS.length; j++) {
    if (ua.indexOf(UA_PATTERNS[j].pattern) !== -1) {
      agentType = UA_PATTERNS[j].type;
      agentCategory = UA_PATTERNS[j].category;
      detectionMethod = "user-agent";
      break;
    }
  }

  for (var k = 0; k < REFERRER_DOMAINS.length; k++) {
    if (ref.indexOf(REFERRER_DOMAINS[k].domain) !== -1) {
      if (!agentType) {
        agentType = REFERRER_DOMAINS[k].type;
        agentCategory = REFERRER_DOMAINS[k].category;
        detectionMethod = "referrer";
      } else {
        detectionMethod = "both";
      }
      break;
    }
  }

  if (probe) {
    agentType = "probe-ping";
    agentCategory = "user-action";
    detectionMethod = "user-agent";
  } else if (!agentType) return;

  var pageType = "other";
  try {
    if (window.__ECENTIC_CONFIG__ && window.__ECENTIC_CONFIG__.pageType) {
      pageType = window.__ECENTIC_CONFIG__.pageType;
    } else if (
      location.pathname.indexOf("/products/") !== -1 ||
      location.pathname.indexOf("/product/") !== -1
    ) {
      pageType = "product";
    } else if (
      location.pathname.indexOf("/collections/") !== -1 ||
      location.pathname.indexOf("/category/") !== -1
    ) {
      pageType = "collection";
    } else if (location.pathname.indexOf("/search") !== -1) {
      pageType = "search";
    } else if (
      location.pathname === "/" ||
      location.pathname === "/index.html"
    ) {
      pageType = "homepage";
    }
  } catch (_) {}

  var productExternalId = null;
  try {
    if (window.__ECENTIC_CONFIG__ && window.__ECENTIC_CONFIG__.productExternalId)
      productExternalId = String(window.__ECENTIC_CONFIG__.productExternalId);
  } catch (_) {}

  var payload = {
    storeId: storeId,
    productUrl: location.href,
    userAgent: ua,
    referrer: ref,
    agentType: agentType,
    agentCategory: agentCategory,
    detectionMethod: detectionMethod,
    pageType: pageType,
    timestamp: new Date().toISOString(),
  };

  if (productExternalId) payload.productExternalId = productExternalId;

  var beaconUrl = apiOrigin + "/api/tracking/agent-visit";

  try {
    fetch(beaconUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(payload),
      mode: "cors",
      keepalive: true,
    }).catch(function () {});
  } catch (_) {}
})();
