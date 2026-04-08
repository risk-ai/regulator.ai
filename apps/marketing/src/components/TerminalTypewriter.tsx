"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalTypewriterProps {
  lines: { text: string; className?: string; delay?: number }[];
  baseDelay?: number;
  lineDelay?: number;
}

export default function TerminalTypewriter({ 
  lines, baseDelay = 0, lineDelay = 600 
}: TerminalTypewriterProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          
          // Reveal lines one by one
          lines.forEach((_, i) => {
            setTimeout(() => {
              setVisibleLines(prev => prev + 1);
            }, baseDelay + (i * lineDelay));
          });
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lines, baseDelay, lineDelay]);

  return (
    <div ref={ref} className="space-y-2">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`transition-all duration-500 ${
            i < visibleLines 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 -translate-x-4'
          } ${line.className || ''}`}
        >
          {line.text}
        </div>
      ))}
      {visibleLines < lines.length && visibleLines > 0 && (
        <div className="text-amber-500 animate-pulse text-xs">▌</div>
      )}
    </div>
  );
}
