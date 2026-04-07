import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — Vienna OS",
  description: "Complete documentation for Vienna OS: API reference, SDK guides, policy configuration, deployment, and integration tutorials.",
  openGraph: {
    title: "Documentation — Vienna OS",
    description: "Complete documentation for Vienna OS: API reference, SDK guides, policy configuration, deployment, and integration tutorials.",
    url: "https://regulator.ai/docs",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
