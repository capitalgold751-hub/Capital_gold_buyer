"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "capital-consent-v1";

function trackPageView() {
  let sessionId = sessionStorage.getItem("capital-session-id");
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem("capital-session-id", sessionId); }
  const params = new URLSearchParams(window.location.search);
  const payload = JSON.stringify({ eventName: "page_view", sessionId, pagePath: window.location.pathname, referrerHost: document.referrer ? new URL(document.referrer).hostname : "direct", campaign: params.get("utm_source") || "organic" });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
  else fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
}

export function PwaRegister() {
  const [showConsent, setShowConsent] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => undefined);
    }
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "analytics") window.setTimeout(trackPageView, 0);
    else if (!consent) window.setTimeout(() => setShowConsent(true), 0);
  }, []);
  function choose(value: "analytics" | "essential") {
    localStorage.setItem(CONSENT_KEY, value);
    setShowConsent(false);
    if (value === "analytics") trackPageView();
  }
  if (!showConsent) return null;
  return <aside className="consent-banner" aria-label="Privacy choices"><div><strong>Privacy choices</strong><p>Essential PWA storage keeps the site working. With your permission, anonymous first-party analytics helps measure visits and conversions. Enquiry data is collected only when you submit a form.</p></div><div><button className="button button-glass" onClick={() => choose("essential")}>Essential only</button><button className="button button-gold" onClick={() => choose("analytics")}>Allow analytics</button></div></aside>;
}
