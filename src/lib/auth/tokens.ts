import { errors, jwtVerify, SignJWT } from "jose";
import { env } from "../../env.ts";

const ISSUER = "voyageurs";
const AUDIENCE = "voyageurs-api";

export const ACCESS_MAX_AGE_MS = 60 * 60 * 1000;
export const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type TokenType = "access" | "refresh";

export type Session = { userId: number; sessionId: string };

const keys = {
  access: new TextEncoder().encode(env.JWT_ACCESS_SECRET),
  refresh: new TextEncoder().encode(env.JWT_REFRESH_SECRET),
};

const maxAge = { access: ACCESS_MAX_AGE_MS, refresh: REFRESH_MAX_AGE_MS };

export const bearerToken = (header?: string) =>
  header?.match(/^Bearer (.+)$/)?.[1]?.trim() || undefined;

const signToken = (type: TokenType, { userId, sessionId }: Session) => {
  const token = new SignJWT({ userId, typ: type, ...(type === "access" && { sid: sessionId }) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + maxAge[type]));

  return (type === "refresh" ? token.setJti(sessionId) : token).sign(keys[type]);
};

/** Both tokens name the session: access tokens as `sid`, refresh tokens as their `jti`. */
export const signTokens = async (session: Session) => {
  const [accessToken, refreshToken] = await Promise.all([
    signToken("access", session),
    signToken("refresh", session),
  ]);
  return { accessToken, refreshToken };
};

export const verifyToken = async (
  type: TokenType,
  token?: string,
): Promise<Session | undefined> => {
  if (!token) return;

  try {
    const { payload } = await jwtVerify(token, keys[type], {
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
