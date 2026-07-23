export function cleanText(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

export function validateName(value: unknown) {
  const name = cleanText(value, 60);
  if (name.length < 2 || !/^[\p{L} .'-]+$/u.test(name)) {
    throw new Error("Enter a valid full name.");
  }
  return name;
}

export function normalizeIndianPhone(value: unknown) {
  let digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) throw new Error("Enter a valid 10-digit mobile number.");
  return `+91${digits}`;
}

export function validateEmail(value: unknown, required = false) {
  const email = cleanText(value, 120).toLowerCase();
  if (!email && !required) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export function slugify(value: unknown) {
  return cleanText(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function safeError(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";
  const customerSafe = /^(Enter|Choose|Select|Please|Tell|Too many|The selected|Invalid|Lead|Appointment|Gold rate|Complete|Add|Staff|Current password|Password|Email or password|Firebase Email\/Password|Your role|You cannot|Only administrators|This (lead|appointment)|Unsupported dashboard)/;
  return customerSafe.test(error.message) ? error.message : "Something went wrong. Please try again.";
}
