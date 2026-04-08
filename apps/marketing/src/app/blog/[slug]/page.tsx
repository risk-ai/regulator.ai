import { Shield, ArrowLeft, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPost, getAllSlugs } from "@/lib/blog";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title + " | Vienna OS Blog",
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

/** Simple markdown-to-JSX renderer for blog content */
function MarkdownContent({ content }: { content: string }) {
  // Split into blocks by double newlines
  const blocks = content.split(/\n\n+/);

  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-amber-500 prose-strong:text-white prose-code:text-gold-300 prose-code:bg-slate-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Code blocks
        if (trimmed.startsWith("```")) {
          const lines = trimmed.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre key={i} className="bg-slate-900 border border-slate-700 p-4 overflow-x-auto my-6">
              <code className={`text-sm text-zinc-300 ${lang ? `language-${lang}` : ""}`}>
                {code}
              </code>
            </pre>
          );
        }

        // Headers
        if (trimmed.startsWith("#### ")) {
          return <h4 key={i} className="text-lg font-semibold text-white mt-8 mb-3">{trimmed.slice(5)}</h4>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={i} className="text-xl font-semibold text-white mt-10 mb-4">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={i} className="text-2xl font-bold text-white mt-12 mb-4">{trimmed.slice(3)}</h2>;
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          const text = trimmed.replace(/^>\s?/gm, "");
          return (
            <blockquote key={i} className="border-l-4 border-amber-500 pl-4 my-6 text-zinc-400 italic">
              {text}
            </blockquote>
          );
        }

        // Lists (bullet)
        if (/^[-*!]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split("\n").filter((l) => l.trim());
          return (
            <ul key={i} className="space-y-2 my-4 text-zinc-300">
              {items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-zinc-300 leading-relaxed">
                    {item.replace(/^[-*]\s+/, "• ").replace(/^\d+\.\s+/, "")}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        // Tables (basic)
        if (trimmed.includes(" | ")) {
          const rows = trimmed.split("\n").filter((l) => l.trim() && !l.match(/^[-|:\s]+$/));
          return (
            <div key={i} className="overflow-x-auto my-6">
              <table className="w-full text-sm text-zinc-300 border border-slate-700">
                <tbody>
                  {rows.map((row, j) => (
                    <tr key={j} className={j === 0 ? "bg-slate-800/50 font-semibold text-white" : "border-t border-slate-700"}>
                      {row.split("|").filter(Boolean).map((cell, k) => (
                        <td key={k} className="px-4 py-2">{cell.trim()}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Horizontal rule
        if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
          return <hr key={i} className="border-slate-700 my-8" />;
        }

        // Regular paragraph — handle inline formatting
        return (
          <p key={i} className="text-zinc-300 text-lg leading-relaxed my-4"
            dangerouslySetInnerHTML={{
              __html: trimmed
                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code class="text-gold-300 bg-slate-800/50 px-1.5 py-0.5 rounded text-sm">$1</code>')
                .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-amber-500 hover:text-gold-300 underline">$1</a>')
                .replace(/\n/g, '<br />')
            }}
          />
        );
      })}
    </div>
  );
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700/20 via-slate-900/50 to-transparent"></div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <nav className="flex items-center justify-between mb-8">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </a>
          <a href="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-white text-sm">
              Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span>
            </span>
          </a>
        </nav>

        <article className="bg-black backdrop-blur-sm border border-slate-800 p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${post.categoryColor}`}>
              {post.category}
            </span>
            <span className="text-zinc-400">{post.date}</span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
            <span className="text-zinc-500">By {post.author}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent leading-tight">
            {post.title}
          </h1>

          <MarkdownContent content={post.content} />

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <div className="bg-gradient-to-r from-gold-400/10 to-blue-600/10 border border-amber-500/20 p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                Ready to govern your AI agents?
              </h3>
              <p className="text-zinc-400 mb-4">
                Start with the open-source Community tier or try Team free for 14 days.
              </p>
              <div className="flex justify-center gap-4">
                <a
                  href="/pricing"
                  className="bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 font-medium transition"
                >
                  View Pricing
                </a>
                <a
                  href="https://github.com/risk-ai/vienna-os"
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 font-medium transition"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
