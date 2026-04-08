"use client";

import { analytics } from "@/lib/analytics";

export default function BlogCTA({ slug }: { slug: string }) {
  const handleClick = () => {
    analytics.ctaClick('blog_post', 'get_started_free');
  };

  return (
    <div className="mt-12 bg-gradient-to-br from-zinc-900 to-black border border-gold-400/20 rounded-xl p-8 text-center">
      <h3 className="text-xl font-bold text-white mb-3">
        Ready to govern your agents?
      </h3>
      <p className="text-slate-400 mb-6 text-sm">
        Start with the free tier. No credit card required.
      </p>
      <a
        href="/signup"
        onClick={handleClick}
        className="inline-flex items-center gap-2 bg-gold-400 hover:bg-gold-300 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm"
      >
        Get Started Free
      </a>
    </div>
  );
}