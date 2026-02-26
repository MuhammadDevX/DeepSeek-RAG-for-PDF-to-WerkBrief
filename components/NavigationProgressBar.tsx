"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

type Phase = "idle" | "loading" | "completing";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [width, setWidth] = useState(0);
  const prevPathname = useRef(pathname);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect link clicks to start the bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Skip non-navigating links
      if (
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("javascript:")
      )
        return;

      // Skip external links
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }

      // Skip same-page anchor-only changes
      const url = new URL(href, window.location.origin);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      setPhase("loading");
      setWidth(0);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Detect navigation completion
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;

      if (phase === "loading") {
        setPhase("completing");
        setWidth(100);

        completionTimer.current = setTimeout(() => {
          setPhase("idle");
          setWidth(0);
        }, 500); // hold 200ms + fade 300ms
      }
    }
  }, [pathname, phase]);

  useEffect(() => {
    return () => {
      if (completionTimer.current) clearTimeout(completionTimer.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {phase !== "idle" && (
        <motion.div
          key="progress-bar"
          className="progress-bar-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="progress-bar-fill"
            style={{
              width: phase === "loading" ? "70%" : "100%",
              transition:
                phase === "loading"
                  ? "width 800ms cubic-bezier(0.15, 0.85, 0.45, 1)"
                  : "width 150ms ease-out",
            }}
          >
            {phase === "loading" && (
              <div className="progress-bar-shimmer" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
