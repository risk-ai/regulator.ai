import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — Vienna OS",
  description:
    "Watch Vienna OS govern a fleet of AI agents in real time. Multi-agent scenarios, cryptographic warrant verification, and policy enforcement — live.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
