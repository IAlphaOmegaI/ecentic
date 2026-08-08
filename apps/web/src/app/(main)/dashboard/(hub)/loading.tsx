import {
  HubShell,
  StoresSkeleton,
  UserBadgeSkeleton,
} from "../_components/hub-shell";

// Instant feedback for navigations into the store hub. Without this boundary
// the router keeps the previous screen frozen — with zero visual response to
// the click — until the first data queries resolve, which reads as a dead link.
//
// It renders the very same `HubShell` the page does, so arriving by link looks
// like arriving by refresh: real header, real heading, real "Connect a store"
// button, with placeholders only where the page itself streams. Drawing those
// static parts as grey boxes made a client navigation look like a different
// screen from a reload of the same URL.
export default () => (
  <HubShell userBadge={<UserBadgeSkeleton />} stores={<StoresSkeleton />} />
);
