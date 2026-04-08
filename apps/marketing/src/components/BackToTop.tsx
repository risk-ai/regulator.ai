"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 left-6 z-40 w-10 h-10 bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 flex items-center justify-center transition-all hover:bg-amber-500/10"
      aria-label="Back to top"
    >
      <ChevronUp className="w-4 h-4" />
    </button>
  );
}
