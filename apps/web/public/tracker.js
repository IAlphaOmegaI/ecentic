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

  // Read storeId from query param on this script tag's src
  var storeId = null;
  try {
    var scripts = document.querySelectorAll('script[src*="tracker.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var url = new URL(scripts[i].src);
      var sid = url.searchParams.get("sid");
      if (sid) {
        storeId = sid;
        break;
      }
    }
    // Fallback to global config
    if (!storeId && window.__ECENTIC_CONFIG__) {
      storeId = window.__ECENTIC_CONFIG__.storeId;
    }
  } catch (_) {}

  if (!storeId) return;

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

  if (!agentType) return;

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

  var payload = JSON.stringify({
    storeId: storeId,
    productUrl: location.href,
    userAgent: ua,
    referrer: ref,
    agentType: agentType,
    agentCategory: agentCategory,
    detectionMethod: detectionMethod,
    pageType: pageType,
    timestamp: new Date().toISOString(),
  });

  try {
    navigator.sendBeacon(
      "/api/tracking/agent-visit",
      new Blob([payload], { type: "application/json" }),
    );
  } catch (_) {}
})();
