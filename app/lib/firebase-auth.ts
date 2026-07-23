type PasswordSignInResponse = {
  idToken: string;
  localId: string;
  email: string;
};

function signInEndpoint() {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  if (!apiKey) throw new Error("FIREBASE_WEB_API_KEY is not configured.");
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : "https://identitytoolkit.googleapis.com";
  return `${base}/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
}

export async function signInWithFirebasePassword(email: string, password: string): Promise<PasswordSignInResponse> {
  const response = await fetch(signInEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json() as Partial<PasswordSignInResponse> & { error?: { message?: string } };
  if (!response.ok || !payload.idToken || !payload.localId || !payload.email) {
    const code = payload.error?.message || "AUTHENTICATION_FAILED";
    const configurationError = ["OPERATION_NOT_ALLOWED", "CONFIGURATION_NOT_FOUND"].includes(code);
    throw new FirebasePasswordError(configurationError
      ? "Firebase Email/Password authentication is not enabled."
      : "Email or password is incorrect.", configurationError);
  }
  return payload as PasswordSignInResponse;
}

export class FirebasePasswordError extends Error {
  constructor(message: string, public readonly configurationError = false) {
    super(message);
  }
}
