/**
 * The 15-minute call on Cal.com. `link` is the event the embed opens; `url` is
 * Cal's own page for it, which every booking control carries as a real `href`
 * so the server HTML links somewhere without JavaScript — for crawlers, link
 * previews and agents, and for anyone whose browser blocks the embed script.
 *
 * A plain module rather than a constant in `components/cal.tsx`: a server
 * component that imports a value from a `"use client"` file gets a client
 * reference, not the string.
 */
const link = "ecentic-ai/15min";

export const booking = {
  link,
  url: `https://cal.com/${link}`,
} as const;
