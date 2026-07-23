export const SITE_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Capital Gold Buyers";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://capitalgoldbuyers.in";
export const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL || "capitalgold751@gmail.com";
export const PRIMARY_PHONE_DISPLAY = process.env.NEXT_PUBLIC_PRIMARY_PHONE_DISPLAY || "+91 80886 50337";
export const PRIMARY_PHONE = process.env.NEXT_PUBLIC_PRIMARY_PHONE || "+918088650337";
export const SECONDARY_PHONE_DISPLAY = process.env.NEXT_PUBLIC_SECONDARY_PHONE_DISPLAY || "+91 87490 55055";
export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/918088650337?text=Hello%20Capital%20Gold%20Buyers%2C%20I%20would%20like%20a%20gold%20evaluation.";
export const PRIMARY_BRANCH = process.env.NEXT_PUBLIC_PRIMARY_BRANCH || "Basaveshwara Nagar";
export const PRIMARY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "1st Floor, 2/80, 3rd Stage, 2nd Block, 7th Main, Basaveshwara Nagar, Bengaluru, Karnataka 560079";
export const GOOGLE_MAPS_URL = process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PRIMARY_ADDRESS)}`;

export const SOCIAL_LINKS = [
  { label: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK_URL || "" },
  { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "" },
  { label: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL || "" },
  { label: "LinkedIn", href: process.env.NEXT_PUBLIC_LINKEDIN_URL || "" },
].filter((link) => link.href);

export const leadStatuses = ["new", "contacted", "interested", "appointment_scheduled", "converted", "closed"] as const;
export const appointmentStatuses = ["pending", "approved", "completed", "cancelled", "no_show"] as const;
