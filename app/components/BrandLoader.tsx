export function BrandLoader({ mode = "route" }: { mode?: "route" | "boot" }) {
  return <div className={`brand-loader ${mode}-loader`} role="status" aria-live="polite" aria-label="Loading Capital Gold Buyers">
    <div className="brand-loader-glow" aria-hidden="true" />
    <div className="brand-loader-mark" aria-hidden="true">
      <span className="loader-ring loader-ring-one" />
      <span className="loader-ring loader-ring-two" />
      <span className="loader-gem">C</span>
    </div>
    <div className="brand-loader-copy">
      <strong>Capital Gold Buyers</strong>
      <span>Preparing a trusted gold experience</span>
    </div>
    <div className="brand-loader-progress" aria-hidden="true"><i /></div>
  </div>;
}
