"use client";

import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: string;
  plan?: string;
}

export default function LeadCaptureModal({
  isOpen,
  onClose,
  trigger,
  plan,
}: LeadCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      analytics.leadCaptureShow(trigger);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, trigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);

    try {
      analytics.leadCaptureSubmit(email, interest || plan || "pricing_interest");

      const leadData = {
        email,
        interest: interest || plan || "pricing_interest",
        trigger,
        timestamp: new Date().toISOString(),
        plan,
      };

      localStorage.setItem(
        "regulator_lead_capture",
        JSON.stringify(leadData)
      );

      setIsSubmitted(true);

      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setEmail("");
        setInterest("");
      }, 3000);
    } catch (error) {
      console.error("Lead capture error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — terminal gold */}
      <div className="relative bg-[#0a0e14] border border-amber-500/30 p-0 max-w-md w-full shadow-xl shadow-amber-500/5 font-mono overflow-hidden">
        {/* Header bar */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              {plan ? `${plan.toUpperCase()}_INQUIRY` : "PRIORITY_ACCESS"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-amber-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {!isSubmitted ? (
            <>
              <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
                {plan
                  ? `Tell us about your ${plan} needs. We'll respond within 24 hours with a personalized governance plan.`
                  : "Join the priority queue for early access and personalized AI governance guidance."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="lead-email"
                    className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-2"
                  >
                    email_address
                  </label>
                  <input
                    type="email"
                    id="lead-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-amber-500/20 text-zinc-300 text-xs placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 transition"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="lead-interest"
                    className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-2"
                  >
                    use_case (optional)
                  </label>
                  <textarea
                    id="lead-interest"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-amber-500/20 text-zinc-300 text-xs placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 transition resize-none"
                    placeholder="e.g., Governing LangChain agents in production, SOC 2 compliance..."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:cursor-not-allowed text-black font-bold px-6 py-3 transition text-xs uppercase tracking-wider"
                >
                  {isSubmitting
                    ? "SUBMITTING..."
                    : "GET_PRIORITY_ACCESS →"}
                </button>
              </form>

              <p className="text-[10px] text-zinc-700 mt-3 text-center">
                no spam • unsubscribe anytime
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex items-center justify-center w-12 h-12 border border-green-500/30 mx-auto mb-4">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-sm font-bold text-white mb-2">
                REQUEST_RECEIVED
              </div>
              <p className="text-zinc-500 text-xs">
                response_time: &lt;24h
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
