import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardIdentity } from "../lib/dashboard-auth";
import { BrandIdentity } from "../components/BrandIdentity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secure Login",
  description: "Secure role-based access for Capital Gold Buyers administrators and staff.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const identity = await getDashboardIdentity().catch(() => null);

  return <main className="login-portal">
    <section className="login-portal-card">
      <header className="login-portal-header">
        <Link href="/" className="brand"><BrandIdentity /></Link>
        <Link href="/" className="login-back-link">Return to website</Link>
      </header>
      <div className="login-portal-body">
        {identity && <aside className="active-session" aria-label="Current authenticated session">
          <span aria-hidden="true">✓</span>
          <div><small>Authenticated session</small><strong>{identity.user.displayName}</strong><p>{identity.user.email} · {identity.role}</p></div>
          <Link className="button button-dark" href="/dashboard">Open Dashboard</Link>
          <a className="session-signout" href="/api/auth/logout?returnTo=/login">Sign out</a>
        </aside>}
        <div className="login-portal-copy">
          <p className="eyebrow">Protected business workspace</p>
          <h1>Choose your authorized login.</h1>
          <p>Admin and staff use separate secure credentials. MongoDB authentication verifies the password, active status and role before protected data is returned.</p>
        </div>
        <div className="login-choice-grid">
          <article className="login-choice-card admin-choice">
            <span className="login-choice-icon" aria-hidden="true">A</span>
            <small>Business control</small>
            <h2>Admin Login</h2>
            <p>Gold rates, staff access, leads, reports, content and business settings.</p>
            <Link className="button button-gold full-width" href="/admin-login">Continue as Admin <span aria-hidden="true">→</span></Link>
          </article>
          <article className="login-choice-card staff-choice">
            <span className="login-choice-icon" aria-hidden="true">S</span>
            <small>Customer operations</small>
            <h2>Staff Login</h2>
            <p>Customer leads, estimate enquiries, appointments and assigned follow-ups.</p>
            <Link className="button button-dark full-width" href="/staff-login">Continue as Staff <span aria-hidden="true">→</span></Link>
          </article>
        </div>
        <p className="login-security-note"><span aria-hidden="true">🔒</span> Secure authentication · Server-side role validation · Protected dashboard and API access</p>
      </div>
    </section>
  </main>;
}
