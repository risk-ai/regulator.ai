import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Status — Vienna OS",
  description: "Real-time operational status of Vienna OS services including API, console, and governance pipeline.",
  openGraph: {
    title: "System Status — Vienna OS",
    description: "Real-time operational status of Vienna OS services including API, console, and governance pipeline.",
    url: "https://regulator.ai/status",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
