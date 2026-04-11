"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/try", label: "Try" },
];

export default function SiteNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="bg-[#09090b]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold flex items-center gap-2 text-white font-mono"
          >
            <svg
              className="w-6 h-6 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span>
              Vienna<span className="text-amber-500">OS</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`transition-colors ${
                  isActive(href)
                    ? "text-amber-500 font-medium"
                    : "text-zinc-500 hover:text-amber-500"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com/risk-ai/vienna-os"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://console.regulator.ai"
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors"
          >
            Sign In
          </a>
          <a
            href="https://console.regulator.ai/signup"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-mono font-bold transition-colors"
          >
            Start Free Trial
          </a>
        </div>
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#09090b] border-t border-white/5 px-6 py-4 space-y-3">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block text-sm ${
                isActive(href)
                  ? "text-amber-500 font-medium"
                  : "text-zinc-500 hover:text-amber-500"
              }`}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/risk-ai/vienna-os"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-zinc-500 hover:text-amber-500"
          >
            GitHub
          </a>
          <a
            href="https://console.regulator.ai"
            className="block text-sm text-zinc-500 hover:text-amber-500"
          >
            Sign In
          </a>
          <a
            href="https://console.regulator.ai/signup"
            className="block px-4 py-2 bg-amber-500 text-black text-sm font-mono font-bold text-center"
          >
            Start Free Trial
          </a>
        </div>
      )}
    </nav>
  );
}
