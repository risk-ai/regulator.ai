import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROI Calculator — Vienna OS",
  description: "Calculate the return on investment of implementing AI governance with Vienna OS.",
  openGraph: {
    title: "ROI Calculator — Vienna OS",
    description: "Calculate the return on investment of implementing AI governance with Vienna OS.",
    url: "https://regulator.ai/roi",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
