import Link from "next/link";
import { BrandIdentity } from "./BrandIdentity";
import { PRIMARY_PHONE, PRIMARY_PHONE_DISPLAY } from "../lib/site-config";

export function ContentShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="content-page"><header className="content-header"><Link href="/" className="brand"><BrandIdentity /></Link><nav><Link href="/#rates">Gold Rates</Link><Link href="/#calculator">Calculator</Link><Link href="/#branches">Branch</Link><Link href="/login">Login</Link><a href={`tel:${PRIMARY_PHONE}`}>{PRIMARY_PHONE_DISPLAY}</a><Link className="button button-gold" href="/#appointment">Book Appointment</Link></nav></header><section className="content-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></section><section className="content-body">{children}</section><footer className="content-footer"><Link href="/">← Return to Capital Gold Buyers</Link><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Login</Link></div></footer></main>;
}
