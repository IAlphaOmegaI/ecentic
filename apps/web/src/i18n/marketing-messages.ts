const pendingMarker = /\{\{\s*TODO\b[\s\S]*?\}\}/giu;
const noteMarker = /\[NOTE\b[\s\S]*?\]/giu;

export const cleanMarketingText = (
  text: string,
  { review, pendingLabel }: cleanMarketingText.Options,
) => {
  const cleaned = text
    .replace(noteMarker, "")
    .replace(pendingMarker, review ? pendingLabel : "");

  if (cleaned === text) return text;

  return cleaned
    .replace(/\(\s*\)/g, "")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();
};

export namespace cleanMarketingText {
  export type Options = {
    review: boolean;
    pendingLabel: string;
  };
}

const prepareBranch = (
  branch: unknown,
  path: string,
  options: cleanMarketingText.Options,
) => {
  if (branch === null || typeof branch !== "object") return;

  for (const [key, value] of Object.entries(branch)) {
    const location = `${path}.${key}`;
    if (typeof value !== "string") {
      prepareBranch(value, location, options);
      continue;
    }

    // A year without the unresolved rights holder is not a complete notice.
    const copyrightPending =
      location === "enterpriseChrome.footer.copyright" &&
      value.match(pendingMarker) !== null;
    const reviewLabel = location === "enterpriseReview.pending";
    const prepared =
      (copyrightPending || reviewLabel) && !options.review
        ? ""
        : cleanMarketingText(value, options);
    Reflect.set(branch, key, prepared);
  }
};

/**
 * Only string values change, and only in marketing namespaces. Keys, array
 * positions and non-string values retain their shape, so the cloned catalog
 * keeps next-intl's inferred message type without a second message interface.
 * Source catalogs remain untouched for the review pack's owner questions.
 */
export const prepareMarketingMessages = <
  Messages extends Record<string, unknown>,
>(
  messages: Messages,
  options: cleanMarketingText.Options,
): Messages => {
  const prepared = structuredClone(messages);
  for (const [namespace, branch] of Object.entries(prepared)) {
    if (!namespace.startsWith("enterprise")) continue;
    prepareBranch(branch, namespace, options);
  }
  return prepared;
};
