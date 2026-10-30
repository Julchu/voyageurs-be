import { type Response, type Router, Router as createRouter } from "express";
import type { AuthRequest } from "../../types";
import { logSearch, listSearches } from "./search.service.ts";
import { searchBodySchema } from "./search.validation.ts";

export const searchRouter: Router = createRouter();

searchRouter.get("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const searches = await listSearches(req.userId);
  res.json({ success: true, data: searches });
});

searchRouter.post("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const parsed = searchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid search" });
    return;
  }

  const search = await logSearch(req.userId, parsed.data);
  res.status(201).json({ success: true, data: search });
});
