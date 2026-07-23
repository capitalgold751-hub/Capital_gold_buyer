export const revalidate = 3600;

import type { Metadata } from "next";
import { COLLECTIONS, listDocuments } from "../../db";
import type { BranchDocument } from "../../db/schema";
import { ContentShell } from "../components/ContentShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gold Buyer Branches in Bengaluru", description: "Find Capital Gold Buyers branch addresses, business hours, phone numbers and directions in Bengaluru.", alternates: { canonical: "/branches" } };

export default async function BranchesPage() {
  const rows = await listDocuments<BranchDocument>(COLLECTIONS.branches, {
    filters: [{ field: "isActive", op: "==", value: true }], orderBy: { field: "name", direction: "asc" },
  });
  return <ContentShell eyebrow="Branch directory" title="Visit Capital Gold Buyers in Bengaluru." description="Choose a branch, call the team or open turn-by-turn directions before your visit."><div className="public-branch-grid">{rows.map((branch) => <article className="guide-article" key={branch.id}><span>Active branch</span><h2>{branch.name}</h2><p>{branch.address}</p><dl><div><dt>Business hours</dt><dd>{branch.businessHours}</dd></div><div><dt>Phone</dt><dd><a href={`tel:${branch.phone}`}>{branch.phone}</a></dd></div>{branch.email && <div><dt>Email</dt><dd><a href={`mailto:${branch.email}`}>{branch.email}</a></dd></div>}</dl><div className="branch-actions"><a className="button button-gold" href={`tel:${branch.phone}`}>Call Branch</a><a className="button button-glass" href={branch.mapsUrl} target="_blank" rel="noreferrer">Open Directions</a></div></article>)}</div></ContentShell>;
}
