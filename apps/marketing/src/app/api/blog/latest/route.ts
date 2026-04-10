import { NextResponse } from "next/server";
import { getAllSlugs, getPostMeta } from "@/lib/blog";

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  try {
    const slugs = getAllSlugs();
    const posts = slugs
      .map((slug) => getPostMeta(slug))
      .filter(Boolean)
      .sort((a, b) => {
        const da = new Date(a!.date).getTime();
        const db = new Date(b!.date).getTime();
        return db - da;
      })
      .slice(0, 3)
      .map((p) => ({
        slug: p!.slug,
        title: p!.title,
        category: p!.category,
        readTime: p!.readTime,
      }));

    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
