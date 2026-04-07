import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try Vienna OS — Interactive Sandbox",
  description: "Try Vienna OS governance in your browser. Submit intents, see risk tiering, and experience warrant authorization — no signup required.",
  openGraph: {
    title: "Try Vienna OS — Interactive Sandbox",
    description: "Try Vienna OS governance in your browser. Submit intents, see risk tiering, and experience warrant authorization — no signup required.",
    url: "https://regulator.ai/try",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
