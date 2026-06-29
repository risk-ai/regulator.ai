import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing Portal — Vienna OS",
  description: "Secure Vienna OS billing portal redirect.",
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

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
