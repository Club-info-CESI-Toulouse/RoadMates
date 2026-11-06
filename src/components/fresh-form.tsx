"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";

// Next keeps visited pages alive with their state: remount the form once the
// user leaves, so coming back shows a clean form.
export function FreshForm({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);
  useEffect(() => () => setGeneration((g) => g + 1), []);
  return <Fragment key={generation}>{children}</Fragment>;
}
