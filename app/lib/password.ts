export function validatePasswordStrength(password: unknown) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("Password must contain 12–128 characters.");
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include uppercase, lowercase, number and special characters.");
  }
  return password;
}
