import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Vienna OS",
  description: "Insights on AI governance, agent authorization, cryptographic warrants, compliance, and building trustworthy autonomous systems.",
  openGraph: {
    title: "Blog — Vienna OS",
    description: "Insights on AI governance, agent authorization, cryptographic warrants, compliance, and building trustworthy autonomous systems.",
    url: "https://regulator.ai/blog",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
