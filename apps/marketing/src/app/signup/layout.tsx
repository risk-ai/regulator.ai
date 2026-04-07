import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — Vienna OS",
  description: "Create your Vienna OS account and start governing your AI agents in minutes. Free tier available.",
  openGraph: {
    title: "Sign Up — Vienna OS",
    description: "Create your Vienna OS account and start governing your AI agents in minutes. Free tier available.",
    url: "https://regulator.ai/signup",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
