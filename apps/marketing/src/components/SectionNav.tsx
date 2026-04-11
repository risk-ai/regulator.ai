"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "hero", label: "Hero" },
  { id: "pipeline", label: "Pipeline" },
  { id: "architecture", label: "Architecture" },
  { id: "risk", label: "Risk Tiers" },
  { id: "use-cases", label: "Use Cases" },
  { id: "sdk", label: "SDK" },
  { id: "analysis", label: "Analysis" },
  { id: "protocol", label: "Protocol" },
  { id: "simulator", label: "Try It" },
  { id: "cta", label: "Get Started" },
];

export default function SectionNav() {
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-50% 0px -50% 0px", // Trigger when section is in middle of viewport
      }
    );

    // Observe all sections
    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navHeight = 64; // Height of sticky nav
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3">
      {sections.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          className="group relative"
          aria-label={`Navigate to ${label}`}
        >
          {/* Dot indicator */}
          <div
            className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
              activeSection === id
                ? "bg-amber-500 border-amber-500 scale-125"
                : "bg-transparent border-zinc-600 hover:border-amber-500/50"
            }`}
          />

          {/* Tooltip on hover */}
          <span className="absolute right-6 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black border border-amber-500/30 px-3 py-1.5 text-xs font-mono text-amber-500 pointer-events-none">
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}
