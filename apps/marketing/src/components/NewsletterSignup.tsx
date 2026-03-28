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
        <h3 className="text-lg font-semibold text-white mb-2">You're on the waitlist!</</h3>
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