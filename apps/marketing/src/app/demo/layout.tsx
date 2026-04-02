import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Demo — Vienna OS",
  description:
    "Experience Vienna OS governance in action — interactive demos with real API calls, live pipeline execution, cryptographic warrants, and policy enforcement. See AI agent governance live.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
