import { Router } from "express";
import { requireUser } from "../../middleware/require-user.ts";
import { parse } from "../../lib/validation.ts";
import { getTripadvisorPhotos } from "./tripadvisor.service.ts";
import { photosQuerySchema } from "./tripadvisor.validation.ts";

export const tripadvisorRouter: Router = Router();

// Signed-in only: every lookup is billed.
tripadvisorRouter.get(
  "/photos",
  requireUser(async (req, res) => {
    const place = parse(photosQuerySchema, req.query);
    res.json({ success: true, data: await getTripadvisorPhotos(place) });
  }),
);
