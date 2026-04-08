"use client";

import { useEffect, useRef, useState } from "react";

export default function WarrantAnimation() {
  const [phase, setPhase] = useState(0); // 0=idle, 1=populating, 2=signing, 3=sealed
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          // Sequence: populate fields → compute signature → seal
          setTimeout(() => setPhase(1), 500);   // Start populating
          setTimeout(() => setPhase(2), 3000);  // Start signing
          setTimeout(() => setPhase(3), 4500);  // Sealed
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {/* Animated seal overlay */}
      {phase === 3 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="px-6 py-2 border-2 border-green-500 text-green-500 font-mono text-lg font-bold rotate-[-8deg] opacity-30 tracking-widest">
            WARRANT_SEALED
          </div>
        </div>
      )}
      
      {/* Signature computation animation */}
      {phase === 2 && (
        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-amber-500 animate-pulse z-10">
          computing_signature...
        </div>
      )}
      
      {/* Status indicator */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full transition-all duration-500 ${
        phase === 0 ? 'bg-zinc-700' :
        phase === 1 ? 'bg-amber-500 animate-pulse' :
        phase === 2 ? 'bg-amber-500 animate-pulse' :
        'bg-green-500'
      }`} />
    </div>
  );
}
