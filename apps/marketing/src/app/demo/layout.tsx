import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — Vienna OS",
  description:
    "Watch the Vienna OS execution kernel govern autonomous AI agents in real time. Multi-agent scenarios with warrants-based governance, cryptographic execution authority, and policy enforcement — live.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
