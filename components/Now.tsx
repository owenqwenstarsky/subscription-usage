"use client";

import { createContext, useContext, useEffect, useState } from "react";

const NowContext = createContext<number>(Date.now());

/** Single shared 1s clock for the whole subtree. Replaces N× per-component timers. */
export function NowProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

export function useNow(): number {
  return useContext(NowContext);
}
