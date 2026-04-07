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
      // Track the lead capture
      analytics.leadCaptureSubmit(email, interest || plan || 'pricing_interest');
      
      // Store in localStorage for follow-up
      const leadData = {
        email,
        interest: interest || plan || 'pricing_interest',
        trigger,
        timestamp: new Date().toISOString(),
        plan: plan
      };
      
      localStorage.setItem('regulator_lead_capture', JSON.stringify(leadData));
      
      setIsSubmitted(true);
      
      // Close after 3 seconds
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-navy-800 to-navy-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-amber-500" />
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
                  className="w-full px-4 py-3 bg-navy-700/50 border border-navy-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-navy-700/50 border border-navy-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Governing LangChain agents in production, SOC 2 compliance..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full bg-amber-500 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2"
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