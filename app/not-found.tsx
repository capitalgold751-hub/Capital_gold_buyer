import Link from "next/link";

export default function NotFound() {
  return <main className="access-page"><section className="glass-card access-card"><p className="eyebrow">404 • Page not found</p><h1>This page has moved or does not exist.</h1><p>Return to the main website to check today’s gold rate, estimate value or book an appointment.</p><Link href="/" className="button button-gold">Return Home</Link></section></main>;
}
