import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Vienna OS",
  description: "Vienna OS is the governance control plane for autonomous AI agents. Built by ai.ventures to bring cryptographic authorization and policy enforcement to AI systems.",
  openGraph: {
    title: "About Vienna OS",
    description: "Vienna OS is the governance control plane for autonomous AI agents. Built by ai.ventures to bring cryptographic authorization and policy enforcement to AI systems.",
    url: "https://regulator.ai/about",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
