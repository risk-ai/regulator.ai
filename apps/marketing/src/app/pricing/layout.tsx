import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Vienna OS",
  description: "Transparent pricing for Vienna OS. Free community tier, Team at $49/mo, Business at $99/mo with usage-based metered billing.",
  openGraph: {
    title: "Pricing — Vienna OS",
    description: "Transparent pricing for Vienna OS. Free community tier, Team at $49/mo, Business at $99/mo with usage-based metered billing.",
    url: "https://regulator.ai/pricing",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
