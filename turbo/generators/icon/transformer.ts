export const kebabToCamel = (str: string) => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Editor-only metadata (class hooks, Nucleo's data-color/data-stroke/data-glass
// hints) that carries no meaning once the SVG becomes a React component.
const NOISE_ATTRIBUTE = /\s(?:class|data-[a-z-]+)="[^"]*"/g;

export const transform = (template: string, { svg }: { svg: string }) => {
  // TODO: transform the svg code to svg jsx with svgr and svgo
  const editable = svg
    .toString()
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "");

  const openingTag = editable.match(/<svg[^>]*>/)?.[0] || "";
  const viewBox = openingTag.match(/viewBox="([^"]*)"/)?.[1] || "0 0 18 18";
  const [, , boxWidth, boxHeight] = viewBox.split(/\s+/);
  const width = openingTag.match(/\swidth="([^"]*)"/)?.[1] || boxWidth || "18";
  const height =
    openingTag.match(/\sheight="([^"]*)"/)?.[1] || boxHeight || "18";

  const content = editable.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || "";

  const processed = content
    .replace(NOISE_ATTRIBUTE, "")
    .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
    .replace(/stroke="(?!none)[^"]*"/g, 'stroke="currentColor"')
    // Lookbehind anchors each attempt to an attribute boundary (right after
    // whitespace) so the negative lookahead can't be skipped by retrying
    // mid-word — that's what previously turned "data-color" into "dataColor".
    .replace(
      /(?<=\s)(?!data-|aria-)([a-z][a-z-]*)="([^"]*)"/g,
      (_, key, value) => {
        return `${kebabToCamel(key)}="${value}"`;
      },
    );

  //TODO: get <title> if it exists in svg content

  return template
    .replace("__SVG_CONTENT__", processed.trim())
    .replace(/__WIDTH__/g, width)
    .replace(/__HEIGHT__/g, height)
    .replace("__VIEWBOX__", viewBox);
};
