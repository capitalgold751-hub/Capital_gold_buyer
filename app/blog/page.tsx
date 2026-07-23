export const revalidate = 3600;

import type { Metadata } from "next";
import { COLLECTIONS, listDocuments } from "../../db";
import type { BlogPostDocument } from "../../db/schema";
import { ContentShell } from "../components/ContentShell";

export const metadata: Metadata = {
  title: "Gold Selling Guides & Purity Education",
  description: "Helpful guides about gold purity, karat, valuation and preparing for a transparent gold evaluation in Bengaluru.",
  alternates: { canonical: "/blog" },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await listDocuments<BlogPostDocument>(COLLECTIONS.blogPosts, {
    filters: [{ field: "status", op: "==", value: "published" }], orderBy: { field: "publishedAt", direction: "desc" },
  });
  return <ContentShell eyebrow="Gold knowledge center" title="Clear gold education for better decisions." description="Understand purity, valuation and the branch process before you choose to sell.">
    {posts.map((post) => <article className="guide-article" id={post.slug} key={post.id}><span>{post.category} • Updated {new Date(post.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><h2>{post.title}</h2><p className="article-excerpt">{post.excerpt}</p>{post.content.split(/\n+/).map((paragraph, index) => <p key={`${post.id}-${index}`}>{paragraph}</p>)}</article>)}
  </ContentShell>;
}
