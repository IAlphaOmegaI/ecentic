// Fetching and parsing must agree on decoded UTF-8 byte limits. Large Shopify
// themes can exceed 4 MiB of HTML even before external scripts are requested.
export const HTML_LIMIT_BYTES = 8 * 1024 * 1024;
export const SCRIPT_LIMIT_BYTES = 1024 * 1024;
