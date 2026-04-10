"use client";

import { useState } from "react";
import { MessageCircle, X, Mail, ExternalLink } from "lucide-react";
import { analytics } from "@/lib/analytics";

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen ? (
        <div className="bg-black border border-amber-500/30 p-0 shadow-2xl min-w-[280px] font-mono overflow-hidden">
          {/* Header */}
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-amber-500 uppercase font-bold">
                SUPPORT_CHANNEL
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-600 hover:text-amber-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-zinc-500 text-xs">
              Need help with Vienna OS? Get priority support:
            </p>

            <a
              href="/contact?subject=enterprise"
              onClick={() => {
                analytics.ctaClick("floating_widget", "schedule_demo");
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-2 transition uppercase"
            >
              <MessageCircle className="w-3 h-3" />
              Schedule Demo
            </a>

            <a
              href="mailto:admin@ai.ventures?subject=Vienna%20OS%20Enterprise%20Inquiry"
              onClick={() => {
                analytics.ctaClick("floating_widget", "email_direct");
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 text-xs font-bold px-3 py-2 transition uppercase"
            >
              <Mail className="w-3 h-3" />
              Email Us
            </a>

            <a
              href="https://github.com/risk-ai/regulatorai/issues"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                analytics.ctaClick("floating_widget", "github_issues");
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full text-zinc-600 hover:text-amber-500 text-[10px] px-1 transition"
            >
              <ExternalLink className="w-3 h-3" />
              Open GitHub Issue
            </a>

            <p className="text-[10px] text-zinc-700 text-center pt-1 border-t border-amber-500/10">
              response_time: &lt;4h
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            analytics.ctaClick("floating_widget", "open");
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black w-12 h-12 shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all hover:scale-110"
          aria-label="Contact support"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
