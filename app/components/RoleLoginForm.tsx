"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandIdentity } from "./BrandIdentity";

export function RoleLoginForm({ role }: { role: "admin" | "staff" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          role,
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || `Sign-in failed (${response.status}).`);
      }

      window.location.replace(data.redirectTo || "/dashboard");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setError("Sign-in timed out. Check MongoDB connectivity or try again.");
      } else {
        setError(reason instanceof Error ? reason.message : "Unable to sign in.");
      }
      setLoading(false);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const admin = role === "admin";

  return (
    <main className="login-portal">
      <section className="login-portal-card role-login-card">
        <header className="login-portal-header">
          <Link href="/" className="brand"><BrandIdentity /></Link>
          <Link href="/login" className="login-back-link">← Login choices</Link>
        </header>
        <div className="login-portal-body role-login-body">
          <div className="login-choice-icon" aria-hidden="true">{admin ? "A" : "S"}</div>
          <p className="eyebrow">{admin ? "Business administration" : "Assigned customer follow-ups"}</p>
          <h1>{admin ? "Admin Login" : "Staff Login"}</h1>
          <p>{admin ? "Manage enquiries, appointments, staff assignment, live rates and reports." : "Open only the leads and appointments assigned to your account, then update every follow-up."}</p>
          <form className="role-login-form" onSubmit={submit}>
            <label>Email address<input name="email" type="email" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className={admin ? "button button-gold full-width" : "button button-dark full-width"} disabled={loading}>
              {loading ? "Signing in securely…" : `Continue as ${admin ? "Admin" : "Staff"}`}
            </button>
          </form>
          <p className="login-security-note"><span aria-hidden="true">🔒</span> MongoDB Authentication · Revocable HTTP-only session · Server-side role validation</p>
        </div>
      </section>
    </main>
  );
}
