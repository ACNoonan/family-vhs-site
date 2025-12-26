// Simple password verification
export function verifyPassword(password: string): boolean {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    console.error("SITE_PASSWORD environment variable is not set");
    return false;
  }
  return password === sitePassword;
}

// Session token generation (simple hash for session validation)
export function generateSessionToken(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${timestamp}:${random}`).toString("base64");
}

// Cookie name for auth
export const AUTH_COOKIE_NAME = "family-vhs-auth";


