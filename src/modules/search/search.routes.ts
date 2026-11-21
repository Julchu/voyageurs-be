import { Router } from "express";
import { requireUser } from "../../middleware/require-user.ts";
import { parse } from "../../lib/validation.ts";
import { listSearches, logSearch } from "./search.service.ts";
import { searchBodySchema } from "./search.validation.ts";

export const searchRouter: Router = Router();

searchRouter.get(
  "/",
  requireUser(async (req, res) => {
    res.json({ success: true, data: await listSearches(req.userId) });
  }),
);

searchRouter.post(
  "/",
  requireUser(async (req, res) => {
    const search = await logSearch(req.userId, parse(searchBodySchema, req.body ?? {}));
    res.status(201).json({ success: true, data: search });
  }),
);
