import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies — Vienna OS",
  description: "See how teams use Vienna OS to govern autonomous AI agents with cryptographic warrants, policy enforcement, and real-time audit trails.",
  openGraph: {
    title: "Case Studies — Vienna OS",
    description: "See how teams use Vienna OS to govern autonomous AI agents with cryptographic warrants, policy enforcement, and real-time audit trails.",
    url: "https://regulator.ai/case-studies",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
