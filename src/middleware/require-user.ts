import type { RequestHandler, Response } from "express";
import { bearerToken } from "../lib/auth/tokens.ts";
import { unauthorized } from "../lib/errors.ts";
import { authenticate } from "../modules/user/auth.service.ts";
import type { AuthRequest } from "../types";
import { userLimit } from "./rate-limit.ts";

type AuthHandler<Params> = (req: AuthRequest<Params>, res: Response) => Promise<void>;

/** Runs the handler only for a signed-in user, with their ID on the request, within their rate limit. */
export const requireUser =
  <Params extends Record<string, string> = Record<string, string>>(
    handler: AuthHandler<Params>,
  ): RequestHandler<Params> =>
  async (req, res, next) => {
    const token = bearerToken(req.header("Authorization"));
    if (!token) throw unauthorized("Missing access token");

    const userId = await authenticate(token);
    if (!userId) throw unauthorized();

    const authReq = Object.assign(req, { userId });
    await userLimit(authReq, res, (error?: unknown) =>
      error ? next(error) : handler(authReq, res).catch(next),
    );
  };
