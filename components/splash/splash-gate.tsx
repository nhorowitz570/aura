"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import logo from "@/assets/auralogo.png";

/**
 * Plays a short branded splash on every mount. Non-blocking — children render
 * underneath. Replace the inner Image with @lottiefiles/dotlottie-react when
 * the package lands.
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const start = Date.now();
    const total = 1400;
    const fadeStart = 800;
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > total) {
        setOpacity(0);
        setVisible(false);
        clearInterval(tick);
      } else if (elapsed > fadeStart) {
        setOpacity(Math.max(0, 1 - (elapsed - fadeStart) / (total - fadeStart)));
      }
    }, 40);
    return () => clearInterval(tick);
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background"
          style={{ opacity, transition: "opacity 0.2s" }}
        >
          <div className="animate-pulse">
            <Image src={logo} alt="" width={120} height={120} priority className="invert dark:invert-0" />
          </div>
        </div>
      )}
    </>
  );
}
