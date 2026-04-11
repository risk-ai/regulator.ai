import type { Metadata } from "next";
import { Shield, Github, MessageCircle, BookOpen, Users, Heart, Star, ArrowRight, Code, Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Community — Vienna OS",
  description:
    "Join the Vienna OS community. Contribute to open-source AI governance, get help, share ideas, and shape the future of responsible AI.",
  openGraph: {
    title: "Community — Vienna OS",
    description: "Join the Vienna OS community for open-source AI governance.",
    url: "https://regulator.ai/community",
  },
};

const channels = [
  {
    name: "GitHub Discussions",
    description: "Ask questions, share ideas, and get help from the community and maintainers.",
    icon: Github,
    href: "https://github.com/risk-ai/vienna-os/discussions",
    cta: "Join Discussion",
    color: "bg-slate-500/20",
    textColor: "text-zinc-300",
  },
  {
    name: "Discord",
    description: "Real-time chat with other Vienna OS users, contributors, and the core team.",
    icon: MessageCircle,
    href: "https://discord.gg/VpQUjSTw",
    cta: "Join Discord",
    color: "bg-amber-500/20",
    textColor: "text-amber-400",
  },
  {
    name: "Twitter / X",
    description: "Follow @Vienna_OS for product updates, governance insights, and community highlights.",
    icon: Star,
    href: "https://twitter.com/Vienna_OS",
    cta: "Follow Us",
    color: "bg-amber-500/20",
    textColor: "text-amber-400",
  },
];

const contributions = [
  {
    title: "Report Bugs",
    description: "Found something broken? Open an issue on GitHub with reproduction steps.",
    icon: "",
    href: "https://github.com/risk-ai/vienna-os/issues/new?template=bug_report.md",
  },
  {
    title: "Request Features",
    description: "Have an idea for Vienna OS? We'd love to hear it.",
    icon: "",
    href: "https://github.com/risk-ai/vienna-os/issues/new?template=feature_request.md",
  },
  {
    title: "Submit a PR",
    description: "Code contributions welcome. Check CONTRIBUTING.md for guidelines.",
    icon: "",
    href: "https://github.com/risk-ai/vienna-os/blob/main/CONTRIBUTING.md",
  },
  {
    title: "Write Documentation",
    description: "Help improve docs, write tutorials, or translate to other languages.",
    icon: "",
    href: "https://github.com/risk-ai/vienna-os/tree/main/docs",
  },
  {
    title: "Share Your Use Case",
    description: "Using Vienna OS in production? We'd love to feature your story.",
    icon: "",
    href: "mailto:hello@ai.ventures?subject=Vienna%20OS%20Use%20Case",
  },
  {
    title: "Security Reports",
    description: "Found a vulnerability? Report it responsibly via our security policy.",
    icon: "",
    href: "https://github.com/risk-ai/vienna-os/blob/main/SECURITY.md",
  },
];

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <Shield className="w-5 h-5 text-amber-500" />
            Vienna OS
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-zinc-400 hover:text-white transition">Docs</a>
            <a href="/examples" className="text-sm text-zinc-400 hover:text-white transition">Examples</a>
            <a
              href="https://console.regulator.ai"
              className="text-sm bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 transition"
            >
              Console
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium mb-4 bg-amber-500/10 px-4 py-2 rounded-full">
            <Users className="w-4 h-4" />
            Open Source Community
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Build the Future of AI Governance
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Vienna OS is open source under the BSL-1.1 license. Join developers, security engineers,
            and compliance professionals building responsible AI infrastructure.
          </p>
        </div>

        {/* Community Channels */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {channels.map((channel) => (
            <a
              key={channel.name}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-zinc-800 p-8 hover:border-amber-500/30 transition group"
            >
              <div className={`w-14 h-14 ${channel.color} flex items-center justify-center mb-6`}>
                <channel.icon className={`w-7 h-7 ${channel.textColor}`} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{channel.name}</h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{channel.description}</p>
              <span className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium group-hover:text-gold-300 transition">
                {channel.cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
          ))}
        </div>

        {/* Contributing */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              <Heart className="w-6 h-6 text-red-400 inline mr-2" />
              Ways to Contribute
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Every contribution matters — from bug reports to code to documentation.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {contributions.map((item) => (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/50 border border-zinc-800 p-6 hover:border-amber-500/20 transition"
              >
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Open Source Stats */}
        <div className="bg-gradient-to-r from-gold-900/30 to-amber-900/30 border border-gold-800/30 p-12 text-center mb-16">
          <h2 className="text-2xl font-bold text-white mb-3">Open Source at Heart</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Vienna OS core is open source. Inspect every line of the governance engine that controls your AI agents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/risk-ai/vienna-os"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 transition font-semibold border border-zinc-800"
            >
              <Github className="w-5 h-5" />
              Star on GitHub
            </a>
            <a
              href="/docs"
              className="inline-flex items-center justify-center gap-2 text-zinc-300 hover:text-white border border-zinc-800 hover:border-slate-500 px-8 py-3 transition font-semibold"
            >
              <BookOpen className="w-5 h-5" />
              Read the Docs
            </a>
          </div>
        </div>

        {/* Code of Conduct */}
        <div className="bg-black/50 border border-zinc-800 p-8 text-center">
          <Lightbulb className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Community Guidelines</h3>
          <p className="text-zinc-400 max-w-lg mx-auto text-sm leading-relaxed">
            We&apos;re committed to providing a welcoming, inclusive environment for everyone.
            Be respectful, constructive, and helpful. See our{" "}
            <a
              href="https://github.com/risk-ai/vienna-os/blob/main/CODE_OF_CONDUCT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-gold-300 transition"
            >
              Code of Conduct
            </a>{" "}
            for details.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-sm text-zinc-500">© 2026 Technetwork 2 LLC dba ai.ventures</span>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-zinc-500">Vienna OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
