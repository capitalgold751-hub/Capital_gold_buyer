export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if ((fetchSite && !["same-origin", "none"].includes(fetchSite)) || (origin && origin !== new URL(request.url).origin)) {
    throw new CrossSiteRequestError("Cross-site actions are blocked.");
  }
}

export function isConsentAccepted(value: unknown) {
  return value === true || value === "true" || value === "on" || value === 1;
}

export class CrossSiteRequestError extends Error {}
