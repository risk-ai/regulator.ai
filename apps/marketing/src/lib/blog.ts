import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  category: string;
  categoryColor: string;
  author: string;
  excerpt: string;
  content: string;
}

/** Slug → markdown filename mapping for docs/blog posts */
const SLUG_TO_FILE: Record<string, string> = {
  "warrants-vs-guardrails": "warrants-vs-guardrails.md",
  "why-ai-agents-need-governance": "why-ai-agents-need-governance.md",
  "ai-agent-disasters-prevented": "ai-agent-disasters-prevented.md",
  "hipaa-compliance-ai-agents": "hipaa-compliance-ai-agents.md",
  "how-execution-warrants-work": "how-execution-warrants-work.md",
  "vienna-os-vs-guardrails-ai": "vienna-os-vs-guardrails-ai.md",
  "vienna-os-vs-arthur-ai": "vienna-os-vs-arthur-ai.md",
  "governing-langchain-agents": "governing-langchain-agents.md",
  "soc2-for-ai-systems": "soc2-for-ai-systems.md",
  "soc2-audit-ai-agents": "soc2-audit-ai-agents.md",
  "ceo-guide-ai-agent-governance": "ceo-guide-ai-agent-governance.md",
  "zero-trust-ai-agent-pipeline": "zero-trust-ai-agent-pipeline.md",
};

/** Post metadata (mirrors the blog index) */
const POST_META: Record<string, Omit<BlogPost, "content">> = {
  "warrants-vs-guardrails": {
    slug: "warrants-vs-guardrails",
    title: "Warrants vs Guardrails: A Better Model for AI Agent Control",
    date: "March 27, 2026",
    readTime: "8 min",
    category: "Architecture",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Max Anderson",
    excerpt: "Guardrails react to outputs after AI models decide. Warrants govern actions before they execute.",
  },
  "why-ai-agents-need-governance": {
    slug: "why-ai-agents-need-governance",
    title: "Why Your AI Agents Need a Governance Layer (Before Something Goes Wrong)",
    date: "March 27, 2026",
    readTime: "8 min",
    category: "Governance",
    categoryColor: "text-purple-400 bg-purple-500/10",
    author: "Max Anderson",
    excerpt: "Picture this: 3:17 AM, your phone buzzes with alerts. Your AI agent just scaled your cluster to 500 nodes.",
  },
  "ai-agent-disasters-prevented": {
    slug: "ai-agent-disasters-prevented",
    title: "5 AI Agent Disasters That Could Have Been Prevented with Execution Control",
    date: "March 28, 2026",
    readTime: "9 min",
    category: "Risk Management",
    categoryColor: "text-red-400 bg-red-500/10",
    author: "ai.ventures",
    excerpt: "Real stories of AI incidents: a $60K overnight cloud bill, PHI exposed to public buckets, unauthorized trading losses.",
  },
  "hipaa-compliance-ai-agents": {
    slug: "hipaa-compliance-ai-agents",
    title: "HIPAA Compliance for AI Agents: A Practical Guide",
    date: "March 28, 2026",
    readTime: "8 min",
    category: "Healthcare",
    categoryColor: "text-green-400 bg-green-500/10",
    author: "ai.ventures",
    excerpt: "Healthcare AI agents need more than content filtering — they need PHI-scoped governance.",
  },
  "how-execution-warrants-work": {
    slug: "how-execution-warrants-work",
    title: "How Execution Warrants Work: The Core of Vienna OS",
    date: "March 28, 2026",
    readTime: "10 min",
    category: "Deep Dive",
    categoryColor: "text-amber-400 bg-amber-500/10",
    author: "ai.ventures",
    excerpt: "Every action in Vienna OS requires a cryptographic warrant — signed, scoped, and time-limited.",
  },
  "vienna-os-vs-guardrails-ai": {
    slug: "vienna-os-vs-guardrails-ai",
    title: "Vienna OS vs Guardrails AI: Execution Control vs Prompt Filtering",
    date: "March 28, 2026",
    readTime: "9 min",
    category: "Comparison",
    categoryColor: "text-purple-400 bg-purple-500/10",
    author: "ai.ventures",
    excerpt: "There are four layers of AI governance. Only one controls execution.",
  },
  "vienna-os-vs-arthur-ai": {
    slug: "vienna-os-vs-arthur-ai",
    title: "Vienna OS vs Arthur AI: When You Need More Than Monitoring",
    date: "March 28, 2026",
    readTime: "8 min",
    category: "Comparison",
    categoryColor: "text-purple-400 bg-purple-500/10",
    author: "ai.ventures",
    excerpt: "Arthur AI monitors model performance. Vienna OS governs agent execution. Here's when you need which.",
  },
  "governing-langchain-agents": {
    slug: "governing-langchain-agents",
    title: "Governing LangChain Agents in Production with Vienna OS",
    date: "March 28, 2026",
    readTime: "11 min",
    category: "Integration",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "ai.ventures",
    excerpt: "LangChain agents are powerful but ungoverned in production. Add execution control in 5 lines of Python.",
  },
  "soc2-for-ai-systems": {
    slug: "soc2-for-ai-systems",
    title: "SOC 2 Compliance for AI Agent Systems: What Auditors Want to See",
    date: "March 27, 2026",
    readTime: "12 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    author: "Max Anderson",
    excerpt: "Vienna OS became the first AI agent governance platform to achieve SOC 2 Type I compliance.",
  },
  "soc2-audit-ai-agents": {
    slug: "soc2-audit-ai-agents",
    title: "How to Pass a SOC 2 Audit with AI Agents",
    date: "March 28, 2026",
    readTime: "10 min",
    category: "Compliance",
    categoryColor: "text-emerald-400 bg-emerald-500/10",
    author: "ai.ventures",
    excerpt: "Complete guide to passing SOC 2 with autonomous AI agents in your stack.",
  },
  "ceo-guide-ai-agent-governance": {
    slug: "ceo-guide-ai-agent-governance",
    title: "The CEO's Guide to AI Agent Governance",
    date: "March 28, 2026",
    readTime: "9 min",
    category: "Leadership",
    categoryColor: "text-amber-400 bg-amber-500/10",
    author: "ai.ventures",
    excerpt: "Enterprise risk meets AI autonomy. A practical guide for executives deploying autonomous agents.",
  },
  "zero-trust-ai-agent-pipeline": {
    slug: "zero-trust-ai-agent-pipeline",
    title: "Building a Zero-Trust AI Agent Pipeline",
    date: "March 28, 2026",
    readTime: "8 min",
    category: "Security",
    categoryColor: "text-blue-400 bg-blue-500/10",
    author: "Vienna OS Team",
    excerpt: "Zero trust isn't just for networks — it applies to AI agents too.",
  },
};

/**
 * Resolve the blog content directory. Content lives in content/blog/
 * within the marketing app (copied from docs/blog/ at repo root).
 * This ensures files are available in Vercel standalone builds.
 */
function getBlogDir(): string {
  const candidates = [
    // Marketing app root (Vercel build cwd = apps/marketing)
    path.join(process.cwd(), "content", "blog"),
    // Monorepo root (local dev)
    path.join(process.cwd(), "apps", "marketing", "content", "blog"),
    // Fallback to docs/blog at monorepo root
    path.join(process.cwd(), "docs", "blog"),
    path.join(process.cwd(), "..", "..", "docs", "blog"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0]; // fallback
}

/** Load a single blog post by slug. Returns null if not found. */
export function getPost(slug: string): BlogPost | null {
  const meta = POST_META[slug];
  if (!meta) return null;

  const filename = SLUG_TO_FILE[slug];
  if (!filename) return { ...meta, content: "Content coming soon." };

  const blogDir = getBlogDir();
  const filePath = path.join(blogDir, filename);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    // Strip frontmatter (--- blocks) and leading title/date lines
    const content = raw
      .replace(/^---[\s\S]*?---\n*/m, "") // YAML frontmatter
      .replace(/^#\s+.*\n*/m, "")          // First H1 title
      .replace(/^\*Published:.*\*\n*/m, "") // Published date line
      .replace(/^---\n*/m, "")             // Stray separator
      .trim();
    return { ...meta, content };
  } catch {
    return { ...meta, content: "Content coming soon." };
  }
}

/** Get all available post slugs for generateStaticParams */
export function getAllSlugs(): string[] {
  return Object.keys(POST_META);
}

/** Get post metadata without loading content */
export function getPostMeta(slug: string): Omit<BlogPost, "content"> | null {
  return POST_META[slug] || null;
}
