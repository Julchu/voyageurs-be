import { type Response, type Router, Router as createRouter } from "express";
import type { AuthRequest } from "../../types";
import { createTrip, listTrips, updateTrip } from "./trip.service.ts";
import { createTripBodySchema, publicIdFrom, updateTripBodySchema } from "./trip.validation.ts";

export const tripRouter: Router = createRouter();

tripRouter.get("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const trips = await listTrips(req.userId);
  res.json({ success: true, data: trips });
});

tripRouter.post("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const parsed = createTripBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid trip" });
    return;
  }

  const saved = await createTrip(req.userId, parsed.data);
  res.status(201).json({ success: true, data: saved });
});

tripRouter.patch("/:publicId", async (req: AuthRequest<{ publicId: string }>, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const publicId = publicIdFrom(req.params.publicId);
  if (!publicId) {
    res.status(404).json({ success: false, error: "Trip not found" });
    return;
  }

  const parsed = updateTripBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid trip" });
    return;
  }

  const saved = await updateTrip(req.userId, publicId, parsed.data);
  if (!saved) {
    res.status(404).json({ success: false, error: "Trip not found" });
    return;
  }
  res.json({ success: true, data: saved });
});
