import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function current(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth >= 1024) return "desktop";
  if (window.innerWidth >= 640) return "tablet";
  return "mobile";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(current);
  useEffect(() => {
    const onResize = () => setBp(current());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}
