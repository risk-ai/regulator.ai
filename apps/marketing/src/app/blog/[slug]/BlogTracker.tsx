"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export default function BlogTracker({ slug }: { slug: string }) {
  useEffect(() => {
    analytics.blogView(slug);
  }, [slug]);

  return null;
}