"use client";

import { useEffect, useState } from "react";

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    // Update progress on scroll
    window.addEventListener("scroll", updateProgress);
    
    // Update progress on resize (in case content height changes)
    window.addEventListener("resize", updateProgress);
    
    // Initial calculation
    updateProgress();

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none"
      style={{
        background: `linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)`,
        transform: `scaleX(${progress / 100})`,
        transformOrigin: "left",
        transition: "transform 0.1s ease-out",
      }}
    />
  );
}