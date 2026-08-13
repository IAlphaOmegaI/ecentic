/**
 * A `ReadableStream.prototype.tee` fallback, installed only when the runtime's
 * own is missing or broken.
 *
 * Next's client entry tees the inlined Flight stream as the very first thing
 * hydration does (`next/dist/client/app-index.js`):
 *
 *     const readable = new ReadableStream({ start: registerWriter });
 *     const [forReact, forCache] = readable.tee();
 *
 * That branch is live for this app because `cacheComponents: true` silently
 * turns on `experimental.cachedNavigations` (`next/dist/server/config.js`),
 * which defines `__NEXT_EXPERIMENTAL_CACHED_NAVIGATIONS` at build time. So a
 * runtime whose `ReadableStream` has no conformant `tee` throws before a single
 * component mounts and the page never becomes interactive — Sentry ECENTIC-E7,
 * `L.tee is not a function`, reported by datacenter clients claiming to be
 * Chrome 126 (real Chrome has had `tee` since 89, so these are headless or
 * embedded runtimes with a partial streams implementation).
 *
 * Imported first from `instrumentation-client.ts`, which Next requires before
 * it requires `app-index` (`next/dist/client/app-next-turbopack.js` pulls in
 * `require-instrumentation-client` at module scope, then hydrates inside
 * `appBootstrap`), so the patch is in place by the time the tee runs.
 */

type Branch = {
  controller: ReadableStreamDefaultController<unknown> | null;
  cancelled: boolean;
  reason: unknown;
  settled: boolean;
};

const tee = function (
  this: ReadableStream<unknown>,
): [ReadableStream<unknown>, ReadableStream<unknown>] {
  const reader = this.getReader();
  const primary: Branch = {
    controller: null,
    cancelled: false,
    reason: undefined,
    settled: false,
  };
  const secondary: Branch = {
    controller: null,
    cancelled: false,
    reason: undefined,
    settled: false,
  };
  const branches = [primary, secondary];

  // One read feeds both branches. A branch that pulls while a read is already
  // in flight awaits that same read rather than taking a second chunk off the
  // source, and a branch nobody is reading buffers in its own queue — which is
  // what the native tee does too.
  const pending: { read: Promise<void> | null } = { read: null };

  const pump = () => {
    if (pending.read) return pending.read;

    const read = reader.read().then(
      ({ done, value }) => {
        pending.read = null;

        for (const branch of branches) {
          if (branch.settled || !branch.controller) continue;

          if (!done) {
            branch.controller.enqueue(value);
            continue;
          }

          branch.settled = true;
          branch.controller.close();
        }
      },
      (error: unknown) => {
        pending.read = null;

        for (const branch of branches) {
          if (branch.settled || !branch.controller) continue;

          branch.settled = true;
          branch.controller.error(error);
        }
      },
    );

    pending.read = read;

    return read;
  };

  const fork = (branch: Branch) =>
    new ReadableStream({
      start: (controller) => {
        branch.controller = controller;
      },
      pull: pump,
      cancel: (reason: unknown) => {
        branch.cancelled = true;
        branch.settled = true;
        branch.reason = reason;

        // The source is cancelled only once nothing is left reading it. Next
        // cancels the cache clone whenever the decoded payload turns out not to
        // need it, and hydration still has to finish on the other branch.
        //
        // One deliberate divergence from the spec: native tee leaves the
        // promise returned by the first branch's `cancel()` pending until the
        // second branch cancels too. This resolves it right away. Next fires
        // `initialFlightStreamForCache?.cancel()` without awaiting it, and a
        // polyfill installed to stop a hang has no business introducing one.
        if (branches.some((candidate) => !candidate.cancelled))
          return undefined;

        return reader.cancel(branches.map((candidate) => candidate.reason));
      },
    });

  return [fork(primary), fork(secondary)];
};

const broken = (() => {
  // Nothing to patch onto, or nothing to build the fallback from. A runtime
  // this incomplete is past rescuing here, and it should fail with its own
  // error rather than one thrown from inside a polyfill.
  if (typeof ReadableStream !== "function") return false;
  if (typeof ReadableStream.prototype.getReader !== "function") return false;

  try {
    const [first, second] = new ReadableStream({
      start: (controller) => controller.close(),
    }).tee();

    return !(
      first instanceof ReadableStream && second instanceof ReadableStream
    );
  } catch {
    // `tee` absent, or present and throwing, or returning something that does
    // not destructure — the reported error message covers all three.
    return true;
  }
})();

if (broken)
  Object.defineProperty(ReadableStream.prototype, "tee", {
    value: tee,
    writable: true,
    configurable: true,
  });
