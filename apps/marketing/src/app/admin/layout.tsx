import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Vienna OS",
  description: "Internal Vienna OS administration surface.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
