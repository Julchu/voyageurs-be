import rateLimit, { type Options } from "express-rate-limit";
import { bearerToken, verifyToken } from "../lib/auth/tokens.ts";

/** A 15-minute budget per key; the key defaults to req.ip. */
const rateLimiter = (limit: number, keyGenerator?: Options["keyGenerator"]) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    keyGenerator,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, please try again later." },
  });

// req.ip is the FE server until the FE forwards the visitor IP and TRUST_PROXY is set.
export const ipLimit = rateLimiter(30);

// One budget per session, so refreshed tokens share it; forged tokens fall back to the caller's IP.
export const refreshLimit = rateLimiter(
  30,
  async (req) =>
    (await verifyToken("refresh", bearerToken(req.header("Authorization"))))?.sessionId ??
    req.ip ??
    "",
);

// requireUser sets req.userId before this runs.
export const userLimit = rateLimiter(1000, (req) => String("userId" in req ? req.userId : ""));
