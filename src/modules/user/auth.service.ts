import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../../env.ts";
import { verifyGoogleCode } from "../../lib/auth/google.ts";
import { REFRESH_MAX_AGE_MS, signTokens, verifyToken } from "../../lib/auth/tokens.ts";
import {
  endSession,
  extendSession,
  isSessionCurrent,
  pruneSessions,
  storeSession,
} from "./auth.queries.ts";
import { getUserByEmail, insertUser } from "./user.queries.ts";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// TODO: create seed data before MASTER_KEY can be used
const masterKey =
  ["development", "staging"].includes(env.NODE_ENV) && env.MASTER_KEY
    ? sha256(env.MASTER_KEY)
    : undefined;
// Equal-length digests, so any token length compares in constant time.
const isMasterKey = (token: string) => !!masterKey && timingSafeEqual(sha256(token), masterKey);

const sessionExpiry = () => new Date(Date.now() + REFRESH_MAX_AGE_MS);

const startSession = async (userId: number) => {
  const sessionId = randomUUID();
  await Promise.all([pruneSessions(userId), storeSession(userId, sessionId, sessionExpiry())]);
  return signTokens({ userId, sessionId });
};

/** The user behind an access token, while its session hasn't been revoked. */
export const authenticate = async (token: string) => {
  if (isMasterKey(token)) return (await getUserByEmail(env.MASTER_TEST_EMAIL))?.id;

  const session = await verifyToken("access", token);
  if (session && (await isSessionCurrent(session))) return session.userId;
};

export const loginWithGoogle = async (code: string, codeVerifier: string) => {
  const account = await verifyGoogleCode(code, codeVerifier);
  if (!account) return;

  // TODO: match by verified Google ID once existing accounts are linked
  const user =
    (await getUserByEmail(account.email)) ??
    (await insertUser({ email: account.email, name: account.name, image: account.picture }));
  return startSession(user.id);
};

/** Slides the session: new tokens for the same session ID. Never revokes, since the FE refreshes in parallel. */
export const refreshSession = async (refreshToken?: string) => {
  const session = await verifyToken("refresh", refreshToken);
  if (session && (await extendSession(session, sessionExpiry()))) return signTokens(session);
};

/** Ends this device's session, named by the refresh token or else the access token. */
export const logout = async (accessToken?: string, refreshToken?: string) => {
  const session =
    (await verifyToken("refresh", refreshToken)) ?? (await verifyToken("access", accessToken));
  if (session) await endSession(session);
};
