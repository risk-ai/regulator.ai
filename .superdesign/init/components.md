# Components Catalog

## Source Code Reference

### SiteNav
**Path:** `src/components/SiteNav.tsx`
**Type:** Client Component (Navigation)
**Props:** None
**Usage:** Main site navigation bar with mobile menu toggle

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function SiteNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-[#09090b]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold flex items-center gap-2 text-white">
            <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span>Vienna<span className="text-purple-400">OS</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/compare" className="text-gray-400 hover:text-white transition-colors">Compare</Link>
            <Link href="/enterprise" className="text-gray-400 hover:text-white transition-colors">Enterprise</Link>
            <Link href="/try" className="text-gray-400 hover:text-white transition-colors">Try</Link>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">GitHub</a>
          <a href="https://console.regulator.ai" className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</a>
          <a href="https://console.regulator.ai/signup" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">Start Free Trial</a>
        </div>
        <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#09090b] border-t border-white/5 px-6 py-4 space-y-3">
          <Link href="/docs" className="block text-sm text-gray-400 hover:text-white">Docs</Link>
          <Link href="/pricing" className="block text-sm text-gray-400 hover:text-white">Pricing</Link>
          <Link href="/compare" className="block text-sm text-gray-400 hover:text-white">Compare</Link>
          <Link href="/enterprise" className="block text-sm text-gray-400 hover:text-white">Enterprise</Link>
          <Link href="/try" className="block text-sm text-gray-400 hover:text-white">Try</Link>
          <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-400 hover:text-white">GitHub</a>
          <a href="https://console.regulator.ai" className="block text-sm text-gray-400 hover:text-white">Sign In</a>
          <a href="https://console.regulator.ai/signup" className="block px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg text-center">Start Free Trial</a>
        </div>
      )}
    </nav>
  );
}
```

---

### SiteFooter
**Path:** `src/components/SiteFooter.tsx`
**Type:** Server Component (Footer)
**Props:** None
**Usage:** Sticky footer with links and copyright

```tsx
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-12 bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/try" className="hover:text-white transition-colors">Try</Link></li>
              <li><Link href="/sdk" className="hover:text-white transition-colors">SDK</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><a href="https://console.regulator.ai" className="hover:text-white transition-colors">Console</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Compare</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/compare/guardrails-ai" className="hover:text-white transition-colors">vs Guardrails AI</Link></li>
              <li><Link href="/compare/arthur-ai" className="hover:text-white transition-colors">vs Arthur AI</Link></li>
              <li><Link href="/compare/credo-ai" className="hover:text-white transition-colors">vs Credo AI</Link></li>
              <li><Link href="/compare/calypso-ai" className="hover:text-white transition-colors">vs Calypso AI</Link></li>
              <li><Link href="/compare/holistic-ai" className="hover:text-white transition-colors">vs Holistic AI</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              <li><a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span>© 2026 Vienna OS. BSL 1.1 License.</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">GitHub</a>
            <a href="https://twitter.com/Vienna_OS" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### NewsletterSignup
**Path:** `src/components/NewsletterSignup.tsx`
**Type:** Client Component (Form)
**Props:** `className`, `variant` ("default" | "compact"), `showSocialProof`
**Usage:** Email capture form with dual variants and social proof

```tsx
"use client";

import { useState } from "react";
import { Check, Mail, Users } from "lucide-react";

interface NewsletterSignupProps {
  className?: string;
  variant?: "default" | "compact";
  showSocialProof?: boolean;
}

export default function NewsletterSignup({ 
  className = "", 
  variant = "default",
  showSocialProof = true 
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setEmail("");
      } else {
        const data = await response.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`bg-navy-800/50 border border-navy-700/50 rounded-xl p-6 text-center ${className}`}>
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-400/20 border border-emerald-400/30 rounded-full mb-4 animate-pulse">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">You're on the waitlist!</h3>
        <p className="text-sm text-slate-400">
          We'll notify you when Vienna OS is ready for your use case.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-navy-900 border border-navy-700/50 rounded-xl p-6 ${className}`}>
      {variant === "default" && (
        <>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-400/20 border border-violet-400/30 rounded-full mb-4">
              <Mail className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Join the Vienna OS Waitlist
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Be among the first to govern your AI agents with cryptographic warrants and risk-tiered approval workflows.
            </p>
          </div>

          {showSocialProof && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-navy-800/50 border border-navy-700/30 rounded-lg">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">
                Join 200+ developers governing AI agents
              </span>
            </div>
          )}
        </>
      )}

      {variant === "compact" && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-white mb-2">Stay Updated</h4>
          <p className="text-sm text-slate-400">
            Get notified about Vienna OS updates and new governance features.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={isSubmitting}
              className="flex-1 bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Email address"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="bg-gradient-to-r from-violet-500 to-cyan-400 hover:from-violet-400 hover:to-cyan-300 disabled:from-violet-500/50 disabled:to-cyan-400/50 text-white font-semibold px-6 py-3 rounded-lg transition disabled:cursor-not-allowed flex-shrink-0"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {variant === "compact" ? "..." : "Joining..."}
                </span>
              ) : (
                variant === "compact" ? "Join" : "Join Waitlist"
              )}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400 mt-2">{error}</p>
          )}
        </div>

        {variant === "default" && (
          <p className="text-xs text-slate-500 leading-relaxed">
            No spam. Unsubscribe anytime. We'll send you updates about Vienna OS features,
            security improvements, and governance best practices.
          </p>
        )}
      </form>

      {variant === "compact" && showSocialProof && (
        <div className="mt-4 text-center">
          <span className="text-xs text-slate-600">
            Join 200+ developers • No spam • Unsubscribe anytime
          </span>
        </div>
      )}
    </div>
  );
}
```

---

### FloatingContact
**Path:** `src/components/FloatingContact.tsx`
**Type:** Client Component (Widget)
**Props:** None
**Usage:** Fixed floating action button with contact menu

```tsx
"use client";

import { useState } from "react";
import { MessageCircle, X, Mail, Phone } from "lucide-react";
import { analytics } from "@/lib/analytics";

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen ? (
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 border border-purple-500/30 rounded-2xl p-4 shadow-2xl min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium text-sm">We're online</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-slate-300 text-sm mb-3">
            Need help with Vienna OS? Get priority support:
          </p>
          
          <div className="space-y-2">
            <a
              href="/contact?subject=enterprise"
              onClick={() => {
                analytics.ctaClick('floating_widget', 'schedule_demo');
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
            >
              <MessageCircle className="w-4 h-4" />
              Schedule Demo
            </a>
            
            <a
              href="mailto:admin@ai.ventures?subject=Vienna%20OS%20Enterprise%20Inquiry"
              onClick={() => {
                analytics.ctaClick('floating_widget', 'email_direct');
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
          </div>
          
          <p className="text-xs text-slate-500 mt-2 text-center">
            Response within 4 hours
          </p>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            analytics.ctaClick('floating_widget', 'open');
          }}
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 animate-bounce"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
```

---

### LeadCaptureModal
**Path:** `src/components/LeadCaptureModal.tsx`
**Type:** Client Component (Modal)
**Props:** `isOpen`, `onClose`, `trigger`, `plan`
**Usage:** Full-screen modal for lead capture on trigger

```tsx
"use client";

import { useState, useEffect } from "react";
import { X, Zap, ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: string;
  plan?: string;
}

export default function LeadCaptureModal({ isOpen, onClose, trigger, plan }: LeadCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      analytics.leadCaptureShow(trigger);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, trigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    
    try {
      analytics.leadCaptureSubmit(email, interest || plan || 'pricing_interest');
      
      const leadData = {
        email,
        interest: interest || plan || 'pricing_interest',
        trigger,
        timestamp: new Date().toISOString(),
        plan: plan
      };
      
      localStorage.setItem('regulator_lead_capture', JSON.stringify(leadData));
      
      setIsSubmitted(true);
      
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setEmail("");
        setInterest("");
      }, 3000);
      
    } catch (error) {
      console.error('Lead capture error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-navy-800 to-navy-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-semibold text-white">
                {plan ? `Interested in ${plan}?` : "Get Early Access"}
              </h3>
            </div>

            <p className="text-slate-300 text-sm mb-6">
              {plan 
                ? `Let us know more about your ${plan} needs and we'll get back to you within 24 hours.`
                : "Join our priority list for early access to Vienna OS features and get personalized guidance for your AI governance needs."
              }
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-navy-700/50 border border-navy-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="interest" className="block text-sm font-medium text-slate-300 mb-2">
                  What's your primary use case? (optional)
                </label>
                <textarea
                  id="interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full px-4 py-3 bg-navy-700/50 border border-navy-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Governing LangChain agents in production, SOC 2 compliance..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    Get Priority Access
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-slate-500 mt-3 text-center">
              We'll never share your email. You can unsubscribe at any time.
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-4">
              <Zap className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Thanks! We'll be in touch soon.
            </h3>
            <p className="text-slate-300 text-sm">
              Expect a personalized response within 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### ReadingProgressBar
**Path:** `src/components/ReadingProgressBar.tsx`
**Type:** Client Component (Progress)
**Props:** None
**Usage:** Fixed progress bar showing scroll position

```tsx
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

    window.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);
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
```

---

## Component Summary

| Component | Type | Client/Server | Props |
|-----------|------|--------------|-------|
| SiteNav | Navigation | Client | None |
| SiteFooter | Footer | Server | None |
| NewsletterSignup | Form | Client | className, variant, showSocialProof |
| FloatingContact | Widget | Client | None |
| LeadCaptureModal | Modal | Client | isOpen, onClose, trigger, plan |
| ReadingProgressBar | Progress | Client | None |

All components use Tailwind CSS with custom classes and Lucide React icons. Color scheme: dark background (#09090b), purple/violet accents (#8b5cf6), amber/gold (#fbbf24).
