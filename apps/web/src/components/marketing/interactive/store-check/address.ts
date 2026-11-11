/** Syntax only. Entry.begin owns DNS/network and supported-platform validation. */
export const validStoreAddress = (source: string) => {
  const value = source.trim();
  if (!value || /\s/.test(value) || value.length > 250) return false;
  const address = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (!URL.canParse(address)) return false;
  const url = new URL(address);
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    !url.username &&
    !url.password &&
    /^[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i.test(
      url.hostname,
    )
  );
};
