import type { RequestHandler, Response } from "express";
import { bearerToken } from "../lib/auth/tokens.ts";
import { unauthorized } from "../lib/errors.ts";
import { authenticate } from "../modules/user/auth.service.ts";
import type { AuthRequest } from "../types";

type AuthHandler<Params> = (req: AuthRequest<Params>, res: Response) => Promise<void>;

/** Runs the handler only for a signed-in user, with their ID on the request. */
export const requireUser =
  <Params = Record<string, string>>(handler: AuthHandler<Params>): RequestHandler<Params> =>
  async (req, res) => {
    const token = bearerToken(req.header("Authorization"));
    if (!token) throw unauthorized("Missing access token");

    const userId = await authenticate(token);
    if (!userId) throw unauthorized();

    await handler(Object.assign(req, { userId }), res);
  };
