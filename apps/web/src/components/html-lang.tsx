"use client";

import { useEffect } from "react";

/** Syncs `<html lang>` when the active locale differs from the root default. */
export const HtmlLang = ({ locale }: { locale: string }) => {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
};
