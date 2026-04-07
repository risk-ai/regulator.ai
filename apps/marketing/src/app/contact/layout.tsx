import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Vienna OS",
  description: "Get in touch with the Vienna OS team for enterprise inquiries, partnership opportunities, or technical support.",
  openGraph: {
    title: "Contact — Vienna OS",
    description: "Get in touch with the Vienna OS team for enterprise inquiries, partnership opportunities, or technical support.",
    url: "https://regulator.ai/contact",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
