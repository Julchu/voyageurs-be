import type { CookieOptions, Response } from "express";
import { ACCESS_MAX_AGE_MS, REFRESH_MAX_AGE_MS } from "./tokens.ts";

const { ACCESS_TOKEN_KEY: accessKey, REFRESH_TOKEN_KEY: refreshKey } = process.env;

const options: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export const setAuthCookies = (
  res: Response,
  { accessToken, refreshToken }: { accessToken?: string; refreshToken?: string },
) => {
  if (accessKey && accessToken)
    res.cookie(accessKey, accessToken, { ...options, maxAge: ACCESS_MAX_AGE_MS });
  if (refreshKey && refreshToken)
    res.cookie(refreshKey, refreshToken, { ...options, maxAge: REFRESH_MAX_AGE_MS });
};

export const clearAuthCookies = (res: Response) => {
  if (accessKey) res.clearCookie(accessKey, options);
  if (refreshKey) res.clearCookie(refreshKey, options);
};
