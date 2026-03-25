import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/signup/success"],
      },
    ],
    sitemap: "https://regulator.ai/sitemap.xml",
  };
}
