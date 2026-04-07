import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Vienna OS — AI Governance Alternatives",
  description: "How Vienna OS compares to Guardrails AI, Arthur AI, Credo AI, and other AI governance platforms.",
  openGraph: {
    title: "Compare Vienna OS — AI Governance Alternatives",
    description: "How Vienna OS compares to Guardrails AI, Arthur AI, Credo AI, and other AI governance platforms.",
    url: "https://regulator.ai/compare",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
