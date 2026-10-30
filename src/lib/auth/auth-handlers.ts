import type { NextFunction, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import { getUserByEmail, insertUser } from "../../modules/user/user.service.ts";
import type { AuthRequest } from "../../types";
import {
  refreshTokenIsCurrent,
  revokeUserRefreshTokens,
  storeRefreshToken,
} from "./refresh-tokens.ts";

const JWT_ISSUER = "voyageurs";
const JWT_AUDIENCE = "voyageurs-api";
const ACCESS_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type TokenType = "access" | "refresh";

type TokenClaims = {
  userId: number;
  typ: TokenType;
  sid?: string;
};

// TODO: need to create seed data before being able to use MASTER_KEY
export const allowsDevMasterKey = (token?: string) => {
  if ((process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "staging") || !token)
    return false;
  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) return false;
  return token === masterKey;
};

const hmacKey = (secret: string | undefined, name: string) => {
  if (!secret || secret.length < 32) {
    console.error(`${name} must be at least 32 characters`);
    return;
  }
  return new TextEncoder().encode(secret);
};

export const bearerToken = (header?: string) => {
  if (!header?.startsWith("Bearer ")) return;
  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
};

const verifySignedToken = async (
  token: string,
  secret: string | undefined,
  secretName: string,
  expectedType: TokenType,
): Promise<{ userId: number; jti?: string; sid?: string } | undefined> => {
  const key = hmacKey(secret, secretName);
  if (!key) return;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (payload.typ !== expectedType) return;
    if (typeof payload.userId !== "number") return;

    return {
      userId: payload.userId,
      jti: payload.jti,
      sid: typeof payload.sid === "string" ? payload.sid : undefined,
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return;
    throw error;
  }
};

export const verifyGoogleCode = async (code: string, codeVerifier: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URIS;
  if (!clientId || !clientSecret || !redirectUri) return;

  const client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });

  let idToken: string | undefined;
  try {
    const { tokens } = await client.getToken({ code, codeVerifier });
    idToken = tokens.id_token ?? undefined;
  } catch (error) {
    console.error("Google token exchange failed", error instanceof Error ? error.name : "unknown");
    return;
  }

  if (!idToken) return;

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email_verified || !payload.email) return;

  return {
    // googleSub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
};

export const verifyAccessToken = async (token?: string) => {
  if (!token) return;

  if (allowsDevMasterKey(token)) {
    const user = await getUserByEmail(process.env.MASTER_TEST_EMAIL);
    if (!user?.id) return;
    return { userId: user.id };
  }

  const payload = await verifySignedToken(
    token,
    process.env.JWT_ACCESS_SECRET,
    "JWT_ACCESS_SECRET",
    "access",
  );
  if (!payload?.sid) return;
  const stillCurrent = await refreshTokenIsCurrent({
    userId: payload.userId,
    jti: payload.sid,
  });
  if (!stillCurrent) return;
  return { userId: payload.userId };
};

export const verifyRefreshToken = async (token?: string) => {
  if (!token) return;

  const payload = await verifySignedToken(
    token,
    process.env.JWT_REFRESH_SECRET,
    "JWT_REFRESH_SECRET",
    "refresh",
  );
  if (!payload?.jti) return;
  return { userId: payload.userId, jti: payload.jti };
};

export const createTokens = async ({
  userId,
  refreshToken = false,
  sessionId,
}: {
  userId: number;
  refreshToken?: boolean;
  sessionId?: string;
}) => {
  const sid = refreshToken ? crypto.randomUUID() : sessionId;
  if (!userId || !sid) return;

  const accessKey = hmacKey(process.env.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET");
  if (!accessKey) return;

  const accessExpiresAt = new Date(Date.now() + ACCESS_MAX_AGE_MS);
  const accessToken = await new SignJWT({
    userId,
    typ: "access",
    sid,
  } satisfies TokenClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(accessExpiresAt.getTime() / 1000))
    .sign(accessKey);

  if (!refreshToken) return { accessToken };

  const refreshKey = hmacKey(process.env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET");
  if (!refreshKey) return;

  const refreshExpiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

  const signedRefreshToken = await new SignJWT({
    userId,
    typ: "refresh",
  } satisfies TokenClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setJti(sid)
    .setIssuedAt()
    .setExpirationTime(Math.floor(refreshExpiresAt.getTime() / 1000))
    .sign(refreshKey);

  await storeRefreshToken({
    userId,
    jti: sid,
    expiresAt: refreshExpiresAt,
  });

  return { accessToken, refreshToken: signedRefreshToken };
};

export const loginWithGoogleCode = async (code?: string, codeVerifier?: string) => {
  if (!code || !codeVerifier) return;

  const account = await verifyGoogleCode(code, codeVerifier);
  if (!account?.email || !account.name) return;

  // TODO: Match by verified googleSub after migration; safely link existing accounts first.
  let fetchedUser = await getUserByEmail(account.email);

  if (!fetchedUser) {
    const [newUser] = await insertUser({
      // googleSub: account.googleSub,
      email: account.email,
      name: account.name,
      image: account.picture,
    });
    fetchedUser = newUser;
  }

  if (!fetchedUser) return;

  const tokens = await createTokens({
    userId: fetchedUser.id,
    refreshToken: true,
  });
  if (!tokens?.refreshToken) return;
  return tokens;
};

export const refreshSession = async (token?: string) => {
  const current = await verifyRefreshToken(token);
  if (!current) return;

  const stillCurrent = await refreshTokenIsCurrent(current);
  if (!stillCurrent) return;

  return createTokens({ userId: current.userId, sessionId: current.jti });
};

export const logoutSession = async (accessToken?: string, refreshToken?: string) => {
  const session =
    (await verifyRefreshToken(refreshToken)) ??
    (allowsDevMasterKey(accessToken) ? undefined : await verifyAccessToken(accessToken));

  if (session) await revokeUserRefreshTokens(session.userId);
};

export const userSetter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = bearerToken(req.header("Authorization"));

  if (!token) {
    res.status(401).json({ success: false, error: "Missing access token" });
    return;
  }

  const auth = await verifyAccessToken(token);
  if (!auth) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  req.userId = auth.userId;
  next();
};

const cookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(maxAge !== undefined && { maxAge }),
});

export const setAuthCookies = (res: Response, accessToken?: string, refreshToken?: string) => {
  const accessTokenKey = process.env.ACCESS_TOKEN_KEY;
  const refreshTokenKey = process.env.REFRESH_TOKEN_KEY;

  if (accessTokenKey && accessToken) {
    res.cookie(accessTokenKey, accessToken, cookieOptions(ACCESS_MAX_AGE_MS));
  }

  if (refreshTokenKey && refreshToken) {
    res.cookie(refreshTokenKey, refreshToken, cookieOptions(REFRESH_MAX_AGE_MS));
  }
};

export const clearAuthCookies = (res: Response) => {
  const accessTokenKey = process.env.ACCESS_TOKEN_KEY;
  const refreshTokenKey = process.env.REFRESH_TOKEN_KEY;
  const options = cookieOptions();

  if (accessTokenKey) res.clearCookie(accessTokenKey, options);
  if (refreshTokenKey) res.clearCookie(refreshTokenKey, options);
};
