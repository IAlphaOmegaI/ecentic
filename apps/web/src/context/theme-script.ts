// The pre-paint theme initializer, rendered inline into <head> by the root
// layout so it executes while the HTML is still parsing — before the first
// paint, and long before hydration. Anything later (a `next/script` effect, a
// provider `useEffect`) is too late: a stored dark theme flashes light first.
//
// Kept as a literal string rather than `Function.prototype.toString()` over a
// real function. `toString` returns whatever source the minifier emitted for
// that build, so the injected script body is a build artifact rather than
// something reviewable here — and any truncation of it lands in the page as a
// script that fails to parse.
//
// Must stay in sync with `parseStoredTheme` and `applyTheme` in `./theme`;
// this is the same resolution, written for the browser.
export const THEME_INIT_SCRIPT = `(() => {
  try {
    const stored = (localStorage.getItem("theme") ?? "light").replaceAll('"', "");
    const theme = ["light", "dark", "system"].includes(stored) ? stored : "light";
    const resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    const element = document.documentElement;
    element.classList.remove("light", "dark");
    element.classList.add(resolved);
    element.style.colorScheme = resolved;
  } catch {
    // Storage or matchMedia blocked (private mode, cookie-blocking extensions).
    // The server-rendered default stands; the provider reapplies on mount.
  }
})();`;
