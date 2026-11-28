import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../../env.ts";
import { verifyGoogleCode, verifyGoogleIdToken } from "../../lib/auth/google.ts";
import { REFRESH_MAX_AGE_MS, signTokens, verifyToken } from "../../lib/auth/tokens.ts";
import {
  endSession,
  extendSession,
  isSessionCurrent,
  pruneSessions,
  storeSession,
} from "./auth.queries.ts";
import { getUserByEmail, getUserByGoogleSub, insertUser } from "./user.queries.ts";
import type { GoogleLogin } from "./user.validation.ts";

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

export const loginWithGoogle = async (login: GoogleLogin) => {
  const account = await ("idToken" in login
    ? verifyGoogleIdToken(login.idToken)
    : verifyGoogleCode(login.code, login.codeVerifier));
  if (!account) return;

  const user = (await getUserByGoogleSub(account.googleSub)) ?? (await insertUser(account));
  if (user) return startSession(user.id);
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
