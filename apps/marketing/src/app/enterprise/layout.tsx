import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enterprise — Vienna OS",
  description: "Enterprise-grade AI governance with dedicated support, SLA guarantees, custom policies, SSO, and compliance certifications.",
  openGraph: {
    title: "Enterprise — Vienna OS",
    description: "Enterprise-grade AI governance with dedicated support, SLA guarantees, custom policies, SSO, and compliance certifications.",
    url: "https://regulator.ai/enterprise",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
