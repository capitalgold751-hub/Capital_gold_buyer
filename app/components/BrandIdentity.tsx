import Image from "next/image";
import { SITE_NAME } from "../lib/site-config";

export function BrandIdentity() {
  return <>
    <Image className="brand-logo" src="/images/capital-gold-logo.webp" width={52} height={52} alt="" aria-hidden="true" />
    <span>{SITE_NAME}</span>
  </>;
}
