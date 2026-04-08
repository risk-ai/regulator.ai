"use client";

import { useState } from "react";
import { MessageCircle, X, Mail, Phone } from "lucide-react";
import { analytics } from "@/lib/analytics";

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen ? (
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 border border-gold-400/30 rounded-2xl p-4 shadow-2xl min-w-[280px]">
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
              className="flex items-center gap-2 w-full bg-gold-400 hover:bg-gold-400 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
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
          className="bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 animate-bounce"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}