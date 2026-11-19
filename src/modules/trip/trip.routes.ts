import { Router } from "express";
import { notFound } from "../../lib/errors.ts";
import { isPublicId, parse } from "../../lib/validation.ts";
import { createTrip, listTrips, updateTrip } from "./trip.service.ts";
import { createTripSchema, tripPatchSchema } from "./trip.validation.ts";

export const tripRouter: Router = Router();

tripRouter.get("/", async (req, res) => {
  res.json({ success: true, data: await listTrips(req.userId) });
});

tripRouter.post("/", async (req, res) => {
  const trip = await createTrip(req.userId, parse(createTripSchema, req.body ?? {}));
  res.status(201).json({ success: true, data: trip });
});

tripRouter.patch("/:publicId", async (req, res) => {
  const { publicId } = req.params;
  if (!isPublicId(publicId)) throw notFound("Trip not found");

  const trip = await updateTrip(req.userId, publicId, parse(tripPatchSchema, req.body ?? {}));
  res.json({ success: true, data: trip });
});
