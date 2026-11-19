import type { RequestHandler } from "express";
import { bearerToken } from "../lib/auth/tokens.ts";
import { unauthorized } from "../lib/errors.ts";
import { authenticate } from "../modules/user/auth.service.ts";

export const requireUser: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req.header("Authorization"));
  if (!token) throw unauthorized("Missing access token");

  const userId = await authenticate(token);
  if (!userId) throw unauthorized();

  req.userId = userId;
  next();
};
