/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: <explanation> */
"use client";
import { useEventListener, useLocalStorage } from "@zenncore/web/hooks";
import Script from "next/script";
import {
  createContext,
  type PropsWithChildren,
  type RefObject,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDocument } from "@/hooks/use-document";
export type Theme = "light" | "dark" | "system";

export type ThemeContext = [
  theme: Theme,
  setTheme: (
    action: SetStateAction<Theme>,
    options?: ThemeChangeOptions,
  ) => Promise<void>,
  environment: {
    isPending: boolean;
  },
];

const ThemeContext = createContext<ThemeContext | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light"; // Default fallback for SSR
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") {
    return; // Skip during SSR
  }

  const element = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  // Remove all theme classes first
  element.classList.remove("light", "dark");
  // Add the correct theme class
  element.classList.add(resolved);
  // Update color-scheme for better browser integration
  element.style.colorScheme = resolved;
};

const disableTransitions = (nonce?: string) => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {}; // Return no-op function during SSR
  }

  const css = document.createElement("style");
  if (nonce) css.setAttribute("nonce", nonce);
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(css);

  return () => {
    // Force restyle
    (() => window.getComputedStyle(document.body))();

    // Wait for next tick before removing
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
};

export type ThemeChangeOptions = {
  disableTransitions?: boolean;
  persist?: boolean;
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "light");

  const [isPending, setIsPending] = useState(false);
  const environment = useMemo(() => ({ isPending }), [isPending]);

  const { window } = useDocument();

  const media = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    if (media.current) return;
    if (!window) return;

    media.current = window.matchMedia("(prefers-color-scheme: dark)");
  }, [window]);

  useEventListener(
    "change",
    (e) => {
      if (theme !== "system") return;
      applyTheme(e.matches ? "dark" : "light");
    },
    media as RefObject<MediaQueryList>,
  );

  const handleThemeChange = useCallback(
    async (
      action: SetStateAction<Theme>,
      {
        disableTransitions: transitionsDisabled = false,
        persist,
      }: ThemeChangeOptions,
    ) => {
      const getNewTheme = (previousTheme: Theme) => {
        const newTheme =
          typeof action === "function" ? action(previousTheme) : action;

        applyTheme(newTheme);

        return newTheme;
      };

      if (transitionsDisabled) disableTransitions()();

      setTheme(getNewTheme, { persist });
      setIsPending(false);
    },
    [setTheme],
  );

  const context = useMemo(
    () => [theme, handleThemeChange, environment] as ThemeContext,
    [theme, handleThemeChange, environment],
  );

  return (
    <ThemeContext.Provider value={context}>
      <ThemeScript />
      {children}
    </ThemeContext.Provider>
  );
};

const ThemeScript = () => {
  return (
    <Script
      id="theme"
      dangerouslySetInnerHTML={{
        __html: `(${(
          () => {
            const theme = JSON.parse(
              localStorage.getItem("theme") ?? '"light"',
            );

            const element = document.documentElement;

            if (!element) throw new Error("Document element not found");

            const getSystemTheme = () =>
              window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";

            const resolved = theme === "system" ? getSystemTheme() : theme;

            element.classList.remove("light", "dark");

            element.classList.add(resolved);

            element.style.colorScheme = resolved;
          }
        ).toString()})()`,
      }}
    />
  );
};
