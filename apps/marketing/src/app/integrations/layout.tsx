import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations — Vienna OS",
  description: "Integrate Vienna OS with LangChain, CrewAI, AutoGen, GitHub Actions, Terraform, and your existing AI agent stack.",
  openGraph: {
    title: "Integrations — Vienna OS",
    description: "Integrate Vienna OS with LangChain, CrewAI, AutoGen, GitHub Actions, Terraform, and your existing AI agent stack.",
    url: "https://regulator.ai/integrations",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
