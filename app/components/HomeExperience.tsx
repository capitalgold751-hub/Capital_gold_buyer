/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { COMPANY_EMAIL, GOOGLE_MAPS_URL, PRIMARY_ADDRESS, PRIMARY_BRANCH, PRIMARY_PHONE, PRIMARY_PHONE_DISPLAY, SECONDARY_PHONE_DISPLAY, SITE_NAME, SOCIAL_LINKS, WHATSAPP_URL } from "../lib/site-config";
import { BrandIdentity } from "./BrandIdentity";
import { BrandLoader } from "./BrandLoader";

type Rate = { karat: string; pricePerGram: number };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __capitalInstallPrompt?: InstallPrompt | null;
  }
}

const RATE_ORDER = ["24K", "22K", "18K"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function trackClientEvent(eventName: string) {
  if (localStorage.getItem("capital-consent-v1") !== "analytics") return;
  let sessionId = sessionStorage.getItem("capital-session-id");
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem("capital-session-id", sessionId); }
  const params = new URLSearchParams(window.location.search);
  fetch("/api/analytics", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ eventName, sessionId, pagePath:window.location.pathname, referrerHost:document.referrer ? new URL(document.referrer).hostname : "direct", campaign:params.get("utm_source")||"organic" }), keepalive:true }).catch(()=>undefined);
}
function gtag_report_conversion() {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "conversion", {
      send_to: "AW-18340024414/L9pXCJ6By9UcEN6gmqlE",
      value: 1.0,
      currency: "INR",
    });
  }
}
function Icon({ name }: { name: "shield" | "pin" | "lock" | "chart" | "calculator" | "calendar" | "phone" | "arrow" | "menu" | "close" | "check" | "spark" }) {
  const paths: Record<string, React.ReactNode> = {
    shield: <><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.8-4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    chart: <><path d="M4 19h16M6 15l4-4 3 2 5-6"/><path d="M15 7h3v3"/></>,
    calculator: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.2 19.2 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .4 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function LoadingSpinner() {
  return <span className="loading-spinner" aria-hidden="true" />;
}

export function HomeExperience() {
  const scrollProgressRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState("");
  const [weight, setWeight] = useState("10");
  const [purity, setPurity] = useState("22K");
  const [payoutPercent, setPayoutPercent] = useState("99.9");
  const [estimateName, setEstimateName] = useState("");
  const [estimatePhone, setEstimatePhone] = useState("");
  const [estimateConsent, setEstimateConsent] = useState(true);
  const [estimateResult, setEstimateResult] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [toast, setToast] = useState("");
  const [pageBooting, setPageBooting] = useState(true);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem("capital-loader-seen") === "true";
    if (!alreadySeen) sessionStorage.setItem("capital-loader-seen", "true");
    const timer = window.setTimeout(() => setPageBooting(false), alreadySeen ? 0 : 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncCapturedPrompt = () => setInstallPrompt(window.__capitalInstallPrompt ?? null);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      window.__capitalInstallPrompt = event as InstallPrompt;
      setInstallPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setShowInstallBanner(false); setInstallPrompt(null); };
    const syncTimer = window.setTimeout(syncCapturedPrompt, 0);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("capital-install-ready", syncCapturedPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => { window.clearTimeout(syncTimer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("capital-install-ready", syncCapturedPrompt); window.removeEventListener("appinstalled", onInstalled); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 768px)").matches;
    const installed = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const alreadyShown = sessionStorage.getItem("capital-install-banner-shown") === "true";
    if (!mobileViewport || installed || alreadyShown) return;

    let hideTimer = 0;
    const showTimer = window.setTimeout(() => {
      sessionStorage.setItem("capital-install-banner-shown", "true");
      setShowInstallBanner(true);
      hideTimer = window.setTimeout(() => setShowInstallBanner(false), 8000);
    }, 1400);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rate-enquiries")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load rates.");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates || []);
        setUpdatedAt(data.updatedAt || new Date().toISOString());
      })
      .catch(() => {
  if (!cancelled) {
    setRateError(
      "Live market refresh is temporarily unavailable. Showing the latest published rates.",
    );
  }
})
      .finally(() => !cancelled && setRateLoading(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maximum = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maximum > 0 ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0;
        if (scrollProgressRef.current) scrollProgressRef.current.style.transform = `scaleX(${progress})`;
      });
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const rateMap = useMemo(() => new Map(rates.map((rate) => [rate.karat, rate.pricePerGram])), [rates]);

  function lockEstimate() {
    setEstimateResult(null);
    setEstimateError("");
  }

  async function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstimateLoading(true);
    setEstimateError("");
    try {
      const response = await fetch("/api/estimate-enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: estimateName,
          phone: estimatePhone,
          consent: estimateConsent,
          weight,
          purity,
          payoutPercent,
          branch: PRIMARY_BRANCH,
          company: "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to show the estimate.");
      setEstimateResult(Number(data.estimatedValue));
      trackClientEvent("estimate_unlocked");
      gtag_report_conversion();
      setToast(data.message || "Estimate unlocked and added to the admin follow-up queue.");
    } catch (error) {
      setEstimateResult(null);
      setEstimateError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setEstimateLoading(false);
    }
  }

  async function installApp() {
    const nativePrompt = installPrompt ?? window.__capitalInstallPrompt;
    if (!nativePrompt) { setToast("Open this site in Chrome or Safari, then choose ‘Install app’ or ‘Add to Home Screen’. "); return; }
    await nativePrompt.prompt();
    const choice = await nativePrompt.userChoice;
    if (choice.outcome === "accepted") trackClientEvent("pwa_installed");
    setInstallPrompt(null);
    window.__capitalInstallPrompt = null;
  }

  async function installFromBanner() {
    setShowInstallBanner(false);
    await installApp();
  }

  function dismissInstallBanner() {
    setShowInstallBanner(false);
  }

  return (
    <main className="public-site">
      {pageBooting && <BrandLoader mode="boot" />}
      {showInstallBanner && <aside className="mobile-install-banner" role="status" aria-label="Install Capital Gold Buyers app">
        <span className="mobile-install-icon" aria-hidden="true">C</span>
        <div><strong>Install Capital Gold Buyers</strong><small>Faster access to gold rates, estimates and appointments.</small></div>
        <button className="mobile-install-action" onClick={installFromBanner}>Install</button>
        <button className="mobile-install-close" onClick={dismissInstallBanner} aria-label="Dismiss install suggestion">×</button>
        <span className="mobile-install-timer" aria-hidden="true"><i /></span>
      </aside>}
      <div ref={scrollProgressRef} className="scroll-progress" aria-hidden="true" />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Capital Gold Buyers home">
          <BrandIdentity />
        </Link>
        <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Main navigation">
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#rates" onClick={() => setMenuOpen(false)}>Gold Rates</a>
          <a href="#calculator" onClick={() => setMenuOpen(false)}>Calculator</a>
          <a href="#branches" onClick={() => setMenuOpen(false)}>Branches</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <Link href="/blog" onClick={() => setMenuOpen(false)}>Blog</Link>
          <Link href="/login" className="staff-login-link" onClick={() => setMenuOpen(false)}>Login</Link>
        </nav>
        <div className="header-actions">
          <button className="install-button" onClick={installApp} aria-label="Install Capital Gold Buyers app">Install App</button>
          <a href="#appointment" className="button button-outline button-small"><Icon name="calendar" /> Book Appointment</a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}><Icon name={menuOpen ? "close" : "menu"} /></button>
        </div>
      </header>

      <section className="hero" id="home">
        <img src="/images/hero-modern-trust.webp" alt="Professional gold evaluator inspecting jewellery in a bright Bengaluru office" className="hero-image" fetchPriority="high" decoding="async" />
        <div className="hero-overlay" />
        <div className="particle-field" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
        <div className="hero-content">
          <p className="eyebrow"><Icon name="spark" /> Trusted gold buying service in Bengaluru</p>
          <h1><span>Know Your Gold’s Value.</span><br />Sell With Confidence.</h1>
          <p className="hero-copy">Get a transparent evaluation, admin-managed gold rates and convenient service from a customer-first team.</p>
          <div className="hero-actions">
            <a href="#rates" className="button button-gold"><Icon name="chart" /> Check Today’s Gold Rate</a>
            <a href="#calculator" className="button button-glass"><Icon name="calculator" /> Calculate Gold Value</a>
          </div>
        </div>

        <aside className={rates.length ? "rate-float unlocked" : "rate-float"} aria-label="Today’s gold rates">
          <div className="rate-title"><Icon name="chart" /><span>Today’s Gold Rates</span></div>
          {RATE_ORDER.map((karat) => <div className="mini-rate" key={karat}><strong>{karat}</strong><span className={rateLoading ? "rate-value loading" : "rate-value"}>{rateLoading ? <i className="rate-line-skeleton" aria-hidden="true" /> : rateMap.has(karat) ? `${formatCurrency(rateMap.get(karat)!)} / g` : "Unavailable"}</span></div>)}
          <small>{rates.length ? `Updated ${new Date(updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : rateLoading ? <><LoadingSpinner /> Loading today’s published rates…</> : rateError}</small>
        </aside>

        <aside className="rate-gate rate-enquiry-card" id="rate-enquiry">
          <div className="gate-heading"><span className="gate-icon"><Icon name="phone" /></span><span><strong>Want a personalised gold evaluation?</strong><small>We ask for your name and number only when you send an enquiry or appointment request.</small></span></div>
          <a href="#contact" className="button button-gold">Send Enquiry <Icon name="arrow" /></a>
          <a href="#appointment" className="button button-glass">Book Appointment</a>
        </aside>
      </section>

      <section className="trust-strip" aria-label="Service commitments">
        <div><Icon name="shield" /><span><strong>Transparent Evaluation</strong><small>Clear weight, purity and rate explanation</small></span></div>
        <div><Icon name="pin" /><span><strong>Convenient Bengaluru Branch</strong><small>Book a preferred visit time online</small></span></div>
        <div><Icon name="lock" /><span><strong>Secure Process</strong><small>Consent-led enquiry and protected records</small></span></div>
      </section>

      <div className="trust-marquee" aria-hidden="true"><div><span>Transparent purity testing</span><i>✦</i><span>Accurate digital weighing</span><i>✦</i><span>Clear valuation explanation</span><i>✦</i><span>No details required to view rates</span><i>✦</i><span>Transparent purity testing</span><i>✦</i><span>Accurate digital weighing</span><i>✦</i><span>Clear valuation explanation</span><i>✦</i><span>No details required to view rates</span><i>✦</i></div></div>

      <section className="section reveal" id="about">
        <div className="section-heading center"><p className="eyebrow">A clear process</p><h2>From gold to a clear decision in <span>three steps</span></h2><p>No confusing jargon. See how the evaluation works before making a decision.</p></div>
        <div className="process-grid">
          {[{n:"01",t:"Check the rate",d:"View the latest admin-published gold rates instantly without sharing personal details."},{n:"02",t:"Book an evaluation",d:"Share your name and number only when requesting a convenient branch visit."},{n:"03",t:"Review the offer",d:"Understand verified purity, net weight and the final calculation before you decide."}].map((item) => <article className="glass-card process-card" key={item.n}><span>{item.n}</span><h3>{item.t}</h3><p>{item.d}</p></article>)}
        </div>
      </section>

      <section className="section visual-process reveal" aria-labelledby="visual-process-title">
        <div className="section-heading center"><p className="eyebrow">See the process</p><h2 id="visual-process-title">Professional evaluation, <span>shown clearly</span></h2><p>From non-destructive purity testing to the final explanation, every step is designed to help you make an informed decision.</p></div>
        <div className="visual-process-grid">
          <article className="visual-story-card visual-story-featured">
            <div className="visual-media animated-visual"><img className="motion-gif" src="/images/purity-scan.gif" width={900} height={600} loading="lazy" decoding="async" alt="Animated demonstration of professional gold purity testing" /><img className="motion-static" src="/images/purity-scan-static.webp" width={900} height={600} loading="lazy" decoding="async" alt="Professional gold purity testing with a non-destructive analyzer" /><span className="media-label"><i /> Animated purity scan</span></div>
            <div className="visual-story-copy"><span>01</span><h3>Non-destructive purity testing</h3><p>See how professional equipment helps assess gold purity while your jewellery remains visible throughout the process.</p></div>
          </article>
          <article className="visual-story-card">
            <div className="visual-media"><img src="/images/precision-weighing.webp" width={900} height={600} loading="lazy" decoding="async" alt="Gold bangles being weighed on a calibrated precision scale" /></div>
            <div className="visual-story-copy"><span>02</span><h3>Accurate weighing</h3><p>Gold is weighed on a precision scale so the calculation starts with a clear, measurable value.</p></div>
          </article>
          <article className="visual-story-card">
            <div className="visual-media"><img src="/images/customer-consultation.webp" width={900} height={600} loading="lazy" decoding="async" alt="Gold evaluator clearly explaining a valuation to a customer" /></div>
            <div className="visual-story-copy"><span>03</span><h3>Clear offer explanation</h3><p>Purity, net weight, applicable rate and the indicative offer are explained before you decide.</p></div>
          </article>
        </div>
        <div className="visual-proof-row"><div><strong>18K–24K</strong><span>Purity support</span></div><div><strong>100%</strong><span>Visible process</span></div><div><strong>3 steps</strong><span>From test to clarity</span></div><a href="#appointment" className="text-link">Book a professional evaluation <Icon name="arrow" /></a></div>
      </section>

      <section className="section rate-section reveal" id="rates">
        <div className="section-heading"><p className="eyebrow">Admin-managed pricing</p><h2>Today’s indicative <span>gold rates</span></h2><p>View current published rates freely. Personal details are requested only when you reveal an estimate, send an enquiry or book an evaluation.</p></div>
        <div className="rates-feature">
          <img src="/images/rates-jewellery-banner.webp" loading="lazy" decoding="async" alt="Indian gold jewellery arranged for transparent professional evaluation" />
          <div className="rates-feature-shade" />
          <div className="rates-feature-copy"><span>Market-informed transparency</span><h3>See the published rate before you visit.</h3><p>GoldAPI can refresh the market-linked rate, while authorized admins retain manual control and every update keeps a visible timestamp.</p></div>
          <div className="rates-update-badge"><Icon name="check" /><span><strong>Verified & published</strong><small>{updatedAt ? new Date(updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Updating now"}</small></span></div>
        </div>
        <div className="rates-grid">
          {RATE_ORDER.map((karat, index) => <article className={index === 1 ? "rate-card featured" : "rate-card"} key={karat}><div className="karat-orb">{karat}</div><p>Indicative rate per gram</p><strong>{rateLoading ? <i className="rate-card-skeleton" aria-label="Loading rate" /> : rateMap.has(karat) ? formatCurrency(rateMap.get(karat)!) : "Unavailable"}</strong><small>{rateLoading ? <i className="rate-text-skeleton" aria-hidden="true" /> : rates.length ? "Published by admin • Final value after testing" : "Please call the branch for today’s rate"}</small></article>)}
        </div>
      </section>

      <section className="section calculator-wrap reveal" id="calculator">
        <div className="calculator-copy"><p className="eyebrow">Instant estimator</p><h2>Estimate your gold’s <span>indicative value</span></h2><p>Choose the weight, purity and payout percentage, then enter your name and mobile number to reveal the indicative estimate. The final offer depends on physical testing, net gold weight and approved deductions.</p><ul><li><Icon name="check" />Transparent formula</li><li><Icon name="check" />18K, 22K and 24K support</li><li><Icon name="check" />Details requested only to reveal the estimate</li></ul><div className="calculator-visual"><img src="/images/calculator-flatlay.webp" width={1000} height={750} loading="lazy" decoding="async" alt="Gold jewellery, precision scale and valuation tools arranged for an estimate" /><span><Icon name="calculator" /><strong>Secure online estimate</strong><small>Name and mobile required to reveal value</small></span></div></div>
        <div className="glass-card calculator-card">
          <div className="calculator-fields">
            <label>Gold weight (grams)<input type="number" min="0.1" max="100000" step="0.1" value={weight} onChange={(e) => { setWeight(e.target.value); lockEstimate(); }} onBlur={() => trackClientEvent("calculator_used")} /></label>
            <label>Purity<select value={purity} onChange={(e) => { setPurity(e.target.value); lockEstimate(); }}>{RATE_ORDER.map((karat) => <option key={karat}>{karat}</option>)}</select></label>
            <div className={estimateResult === null ? "estimate-output locked" : "estimate-output unlocked"} aria-live="polite"><small>Estimated value</small><strong>{estimateResult === null ? "₹ ••••••" : formatCurrency(estimateResult)}</strong><span>{estimateResult === null ? "Enter your details below to securely reveal the value." : `${weight || 0} g × ${formatCurrency(rateMap.get(purity) || 0)} × ${payoutPercent}%`}</span></div>
          </div>
          <form className="estimate-gate" onSubmit={submitEstimate}>
            <div className="estimate-gate-heading"><span className="gate-icon"><Icon name="lock" /></span><span><strong>Unlock your estimate</strong><small>Your enquiry enters the admin queue first; an admin can then assign it to one staff member for follow-up.</small></span></div>
            <div className="estimate-gate-grid">
              <label>Full name<input value={estimateName} onChange={(event) => { setEstimateName(event.target.value); lockEstimate(); }} name="name" autoComplete="name" required placeholder="Enter your full name" /></label>
              <label>Mobile number<input value={estimatePhone} onChange={(event) => { setEstimatePhone(event.target.value); lockEstimate(); }} name="phone" inputMode="tel" autoComplete="tel" required placeholder="10-digit mobile number" /></label>
            </div>
            <input name="company" className="honeypot" tabIndex={-1} autoComplete="off" />
            <label className="consent-row"><input type="checkbox" checked={estimateConsent} onChange={(event) => { setEstimateConsent(event.target.checked); lockEstimate(); }} required /><span>I agree to be contacted about this estimate enquiry.</span></label>
            {estimateError && <p className="form-error" role="alert">{estimateError}</p>}
            {estimateResult !== null && <p className="estimate-success"><Icon name="check" /> Estimate unlocked. The enquiry is now in the admin assignment queue.</p>}
            <button className="button button-gold full-width" disabled={estimateLoading || rateLoading || !rates.length}>{(estimateLoading || rateLoading) && <LoadingSpinner />}{estimateLoading ? "Calculating securely…" : rateLoading ? "Loading current rates…" : "Show My Estimate"}{!estimateLoading && !rateLoading && <Icon name="arrow" />}</button>
            <small className="estimate-disclaimer">Final value is subject to branch weight and purity testing.</small>
          </form>
        </div>
      </section>

      <AppointmentSection setToast={setToast} />

      <section className="section reveal" id="branches">
        <div className="section-heading center"><p className="eyebrow">Visit us</p><h2>Your nearby <span>Capital Gold Buyers</span> branch</h2><p>Branch details can be expanded from the admin dashboard as the business grows.</p></div>
        <article className="branch-card glass-card">
          <div className="branch-map"><span className="map-pulse"><Icon name="pin" /></span><div className="map-grid" /></div>
          <div className="branch-details"><span className="status-dot">Open today</span><h3>{PRIMARY_BRANCH} Branch</h3><p>{PRIMARY_ADDRESS}</p><div className="branch-meta"><span>Mon–Sat</span><strong>9:30 AM–7:00 PM</strong></div><div className="branch-actions"><a className="button button-gold" href={`tel:${PRIMARY_PHONE}`}><Icon name="phone" /> Call Branch</a><a className="button button-glass" target="_blank" rel="noreferrer" href={GOOGLE_MAPS_URL}><Icon name="pin" /> Directions</a></div></div>
        </article>
      </section>

      <section className="section content-grid reveal">
        <div><p className="eyebrow">Knowledge builds confidence</p><h2>Gold education, <span>without the noise</span></h2><p>Helpful guides explain purity, documentation and evaluation so customers arrive prepared.</p><Link href="/blog" className="text-link">Explore all guides <Icon name="arrow" /></Link></div>
        <div className="article-stack"><Link href="/blog#purity" className="article-card"><span>Gold Education</span><h3>How Gold Purity Testing Works</h3><p>Understand karat, purity percentage and the transparent evaluation steps.</p></Link><Link href="/blog#karat" className="article-card"><span>Gold Basics</span><h3>18K vs 22K vs 24K Gold</h3><p>A simple guide to common karats and estimated value.</p></Link></div>
      </section>

      <section className="section faq-section reveal"><div className="section-heading"><p className="eyebrow">Common questions</p><h2>Before you <span>visit</span></h2></div><div className="faq-list">{[
        ["Is the online value the final offer?", "No. Online values are indicative. The final offer follows physical weight and purity testing at the branch."],
        ["When do you ask for my name and phone number?", "Viewing published rates does not require personal details. Your name and mobile number are required only when you reveal a calculator estimate, submit an enquiry or request an appointment."],
        ["Can I reschedule an appointment?", `Yes. Call ${PRIMARY_PHONE_DISPLAY} and share your appointment details.`],
        ["How are rates updated?", "GoldAPI can provide a market-linked refresh for 18K, 22K and 24K. Authorized administrators can review or override the indicative buying rates, with timestamps and an audit trail."],
      ].map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

      <ContactSection setToast={setToast} />

      <section className="final-cta"><div><p className="eyebrow">Ready when you are</p><h2>Make your next gold decision with clarity.</h2><p>Check the indicative rate, calculate an estimate or book a branch appointment.</p></div><div><a href="#rates" className="button button-gold">Check Today’s Rate</a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="button button-glass">WhatsApp Us</a></div></section>

      <footer className="site-footer"><div className="footer-grid"><div><Link href="/" className="brand"><BrandIdentity /></Link><p>Transparent gold evaluation and customer-first branch service in Bengaluru.</p>{SOCIAL_LINKS.length > 0 && <div className="social-links" aria-label="Social media">{SOCIAL_LINKS.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}</div>}</div><div><h3>Explore</h3><a href="#rates">Gold Rates</a><a href="#calculator">Calculator</a><a href="#appointment">Appointment</a><Link href="/blog">Gold Guides</Link></div><div><h3>Contact</h3><a href={`tel:${PRIMARY_PHONE}`}>{PRIMARY_PHONE_DISPLAY}</a><span>{SECONDARY_PHONE_DISPLAY}</span><a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a><a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">{PRIMARY_BRANCH}, Bengaluru</a></div><div><h3>Legal & Access</h3><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms & Disclaimer</Link><Link href="/login">Login</Link><button onClick={installApp}>Install PWA</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span><span>Rates are indicative. Final value follows physical testing.</span><p>
    Designed & Developed by{" "}
    <a
      href="https://www.linkedin.com/in/sai-kumar-kundla"
      target="_blank"
      rel="noopener noreferrer"
    >
      SmartDEX
    </a>
  </p></div></footer>

      <div className="mobile-cta"><a href={`tel:${PRIMARY_PHONE}`}><Icon name="phone" /> Call</a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a><a href="#rates"><Icon name="chart" /> Rates</a></div>
      {toast && <div className="toast" role="status"><Icon name="check" /><span>{toast}</span></div>}
    </main>
  );
}

function AppointmentSection({ setToast }: { setToast: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/appointments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form.entries())) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to book appointment.");
      event.currentTarget.reset(); trackClientEvent("appointment_requested"); gtag_report_conversion(); setToast(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); } finally { setLoading(false); }
  }
  return <section className="section appointment-section reveal" id="appointment"><div className="appointment-copy"><p className="eyebrow">Skip the waiting</p><h2>Book a preferred <span>evaluation time</span></h2><p>Your request enters the protected admin queue first. An admin assigns one staff owner, who can confirm and update the visit.</p><div className="appointment-benefits"><div><Icon name="calendar"/><span><strong>Choose your time</strong><small>Four convenient daily slots</small></span></div><div><Icon name="shield"/><span><strong>Assigned follow-up</strong><small>One accountable owner from request to completion</small></span></div></div><div className="appointment-visual"><img src="/images/appointment-consultation.webp" width={1000} height={667} loading="lazy" decoding="async" alt="Customer confirming a professional gold evaluation appointment with staff" /><span><Icon name="calendar" /> A calmer, planned branch visit</span></div></div><form className="glass-card appointment-form" onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" autoComplete="name" required /></label><label>Mobile number<input name="phone" inputMode="tel" autoComplete="tel" required /></label><label>Email (optional)<input name="email" type="email" autoComplete="email" /></label><label>Branch<select name="branch" defaultValue={PRIMARY_BRANCH}><option>{PRIMARY_BRANCH}</option></select></label><label>Date<input name="appointmentDate" type="date" required /></label><label>Time<select name="timeSlot" required defaultValue=""><option value="" disabled>Select a time</option><option>10:00 AM</option><option>12:00 PM</option><option>3:00 PM</option><option>5:00 PM</option></select></label></div><label>Anything our team should know? <textarea name="note" rows={3} /></label><input name="company" className="honeypot" tabIndex={-1} autoComplete="off"/><label className="consent-row"><input type="checkbox" name="consent" value="true" defaultChecked required/><span>I agree to be contacted about this appointment.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-gold full-width" disabled={loading}>{loading && <LoadingSpinner />}{loading ? "Sending request…" : "Request Appointment"}{!loading && <Icon name="arrow"/>}</button></form></section>;
}

function ContactSection({ setToast }: { setToast: (message: string) => void }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); try { const body: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(form.entries()); body.consent = form.get("consent") === "true"; const response = await fetch("/api/contact", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body) }); const data = await response.json(); if(!response.ok) throw new Error(data.error || "Unable to send enquiry."); event.currentTarget.reset(); trackClientEvent("contact_submitted"); gtag_report_conversion(); setToast(data.message); } catch(e){ setError(e instanceof Error ? e.message : "Please try again."); } finally { setLoading(false); } }
  return <section className="section contact-section reveal" id="contact"><div><p className="eyebrow">Talk to the team</p><h2>Have a question before your visit?</h2><p>Share your enquiry and it will appear in the central lead dashboard for follow-up.</p><a href={`tel:${PRIMARY_PHONE}`} className="contact-phone"><Icon name="phone"/><span><small>Call us</small><strong>{PRIMARY_PHONE_DISPLAY}</strong></span></a></div><form className="glass-card contact-form" onSubmit={submit}><div className="form-grid"><label>Name<input name="name" required autoComplete="name"/></label><label>Phone<input name="phone" required inputMode="tel" autoComplete="tel"/></label><label className="full-span">Email (optional)<input name="email" type="email" autoComplete="email"/></label></div><label>Your enquiry<textarea name="message" rows={4} required/></label><input name="company" className="honeypot" tabIndex={-1} autoComplete="off"/><label className="consent-row"><input type="checkbox" name="consent" value="true" defaultChecked required/><span>I agree to be contacted about my enquiry.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-gold full-width" disabled={loading}>{loading && <LoadingSpinner />}{loading ? "Sending…" : "Send Enquiry"}{!loading && <Icon name="arrow"/>}</button></form></section>;
}
