import { OAuth2Client } from "google-auth-library";

const {
  GOOGLE_CLIENT_ID: clientId,
  GOOGLE_CLIENT_SECRET: clientSecret,
  GOOGLE_REDIRECT_URIS: redirectUri,
} = process.env;

const client =
  clientId && clientSecret && redirectUri
    ? new OAuth2Client({ clientId, clientSecret, redirectUri })
    : undefined;

/** Exchanges a PKCE authorization code for the verified Google account. */
export const verifyGoogleCode = async (code: string, codeVerifier: string) => {
  if (!client) return;

  const idToken = await client.getToken({ code, codeVerifier }).then(
    ({ tokens }) => tokens.id_token,
    (error) => {
      console.error(
        "Google token exchange failed",
        error instanceof Error ? error.message : "unknown",
      );
      return undefined;
    },
  );
  if (!idToken) return;

  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.email_verified || !payload.email) return;

  // TODO: also return payload.sub once users are matched by Google ID (see user schema)
  return { email: payload.email, name: payload.name, picture: payload.picture };
};
