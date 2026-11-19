import { randomUUID } from "node:crypto";
import { verifyGoogleCode } from "../../lib/auth/google.ts";
import { REFRESH_MAX_AGE_MS, signToken, verifyToken } from "../../lib/auth/tokens.ts";
import { isSessionCurrent, revokeSessions, storeSession } from "./auth.queries.ts";
import { getUserByEmail, insertUser } from "./user.queries.ts";

// TODO: create seed data before MASTER_KEY can be used
const devMasterKey = ["development", "staging"].includes(process.env.NODE_ENV ?? "")
  ? process.env.MASTER_KEY
  : undefined;
const isDevMasterKey = (token?: string) => !!devMasterKey && token === devMasterKey;

const startSession = async (userId: number) => {
  const sessionId = randomUUID();
  const [accessToken, refreshToken] = await Promise.all([
    signToken("access", userId, sessionId),
    signToken("refresh", userId, sessionId),
  ]);
  if (!accessToken || !refreshToken) return;

  await storeSession(userId, sessionId, new Date(Date.now() + REFRESH_MAX_AGE_MS));
  return { accessToken, refreshToken };
};

/** The user behind an access token, while its session hasn't been revoked. */
export const authenticate = async (token: string) => {
  if (isDevMasterKey(token)) return (await getUserByEmail(process.env.MASTER_TEST_EMAIL))?.id;

  const session = await verifyToken("access", token);
  if (session && (await isSessionCurrent(session))) return session.userId;
};

export const loginWithGoogle = async (code: string, codeVerifier: string) => {
  const account = await verifyGoogleCode(code, codeVerifier);
  if (!account?.name) return;

  // TODO: match by verified Google ID once existing accounts are linked
  const user =
    (await getUserByEmail(account.email)) ??
    (await insertUser({ email: account.email, name: account.name, image: account.picture }));
  return user && startSession(user.id);
};

/** A new access token for the same session. */
export const refreshSession = async (refreshToken?: string) => {
  const session = await verifyToken("refresh", refreshToken);
  if (session && (await isSessionCurrent(session)))
    return signToken("access", session.userId, session.sessionId);
};

/** Signs the user out on every device. */
export const logout = async (accessToken?: string, refreshToken?: string) => {
  const userId =
    (await verifyToken("refresh", refreshToken))?.userId ??
    (accessToken && !isDevMasterKey(accessToken) ? await authenticate(accessToken) : undefined);
  if (userId) await revokeSessions(userId);
};
