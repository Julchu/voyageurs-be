import { errors, jwtVerify, SignJWT } from "jose";

const ISSUER = "voyageurs";
const AUDIENCE = "voyageurs-api";

export const ACCESS_MAX_AGE_MS = 60 * 60 * 1000;
export const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type TokenType = "access" | "refresh";

export type Session = { userId: number; sessionId: string };

// TODO: validate all env vars once at startup
const secretKey = (name: string) => {
  const secret = process.env[name];
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  console.error(`${name} must be at least 32 characters`);
};

const keys = {
  access: secretKey("JWT_ACCESS_SECRET"),
  refresh: secretKey("JWT_REFRESH_SECRET"),
};

const maxAge = { access: ACCESS_MAX_AGE_MS, refresh: REFRESH_MAX_AGE_MS };

export const bearerToken = (header?: string) =>
  header?.match(/^Bearer (.+)$/)?.[1]?.trim() || undefined;

/** Both tokens name the session: access tokens as `sid`, refresh tokens as their `jti`. */
export const signToken = async (type: TokenType, userId: number, sessionId: string) => {
  const key = keys[type];
  if (!key) return;

  const token = new SignJWT({ userId, typ: type, ...(type === "access" && { sid: sessionId }) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + maxAge[type]));

  return (type === "refresh" ? token.setJti(sessionId) : token).sign(key);
};

export const verifyToken = async (
  type: TokenType,
  token?: string,
): Promise<Session | undefined> => {
  const key = keys[type];
  if (!key || !token) return;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const sessionId = type === "access" ? payload.sid : payload.jti;
    if (payload.typ !== type || typeof payload.userId !== "number" || typeof sessionId !== "string")
      return;
    return { userId: payload.userId, sessionId };
  } catch (error) {
    if (error instanceof errors.JOSEError) return;
    throw error;
  }
};
