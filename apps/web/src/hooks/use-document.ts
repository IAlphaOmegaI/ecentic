import { useEffect, useState } from "react";

export const useDocument = () => {
  const [d, setDocument] = useState<Document | null>(null);
  const [w, setWindow] = useState<Window | null>(null);

  useEffect(() => {
    setDocument(document);
    setWindow(window);
  }, []);

  return { document: d, window: w };
};
