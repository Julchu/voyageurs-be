import type { CookieOptions, Response } from "express";
import { env } from "../../env.ts";
import { ACCESS_MAX_AGE_MS, REFRESH_MAX_AGE_MS } from "./tokens.ts";

const options: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export const setAuthCookies = (
  res: Response,
  { accessToken, refreshToken }: { accessToken: string; refreshToken: string },
) => {
  res.cookie(env.ACCESS_TOKEN_KEY, accessToken, { ...options, maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(env.REFRESH_TOKEN_KEY, refreshToken, { ...options, maxAge: REFRESH_MAX_AGE_MS });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(env.ACCESS_TOKEN_KEY, options);
  res.clearCookie(env.REFRESH_TOKEN_KEY, options);
};
