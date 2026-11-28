import { OAuth2Client } from "google-auth-library";
import { env } from "../../env.ts";

const client = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URIS,
});

// A rejected code or ID token is a failed login (401), not a server error.
const failed = (step: string) => (error: unknown) => {
  console.error(`Google ${step} failed`, error instanceof Error ? error.message : "unknown");
  return undefined;
};

/**
 * The verified Google account behind an ID token issued for our web client.
 * The iOS app names the web client as its server client, so its ID tokens pass the same check.
 */
export const verifyGoogleIdToken = async (idToken: string) => {
  const ticket = await client
    .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    .catch(failed("ID token check"));
  const payload = ticket?.getPayload();
  if (!payload?.email_verified || !payload.email) return;

  return {
    googleSub: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.replace(/@.*/, ""),
    image: payload.picture,
  };
};

/** Exchanges a PKCE authorization code for the verified Google account. */
export const verifyGoogleCode = async (code: string, codeVerifier: string) => {
  const idToken = await client
    .getToken({ code, codeVerifier })
    .then(({ tokens }) => tokens.id_token, failed("token exchange"));
  return idToken ? verifyGoogleIdToken(idToken) : undefined;
};
