import { Shield, ArrowLeft, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const posts: Record<
  string,
  {
    title: string;
    date: string;
    readTime: string;
    category: string;
    categoryColor: string;
    content: string;
  }
> = {
  "execution-gap-warrants-not-guardrails": {
    title: "The Execution Gap: Why AI Governance Needs Warrants, Not Just Guardrails",
    date: "March 30, 2026",
    readTime: "9 min",
    category: "Governance",
    categoryColor: "text-purple-400 bg-purple-500/10",
    content: "Blog post content temporarily unavailable. Check back soon.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title + " | Vienna OS Blog",
    description: post.content.slice(0, 160),
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700/20 via-slate-900/50 to-transparent"></div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <a
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </a>

        <article className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6 text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${post.categoryColor}`}>
              {post.category}
            </span>
            <span className="text-slate-400">{post.date}</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>

          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {post.title}
          </h1>

          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
