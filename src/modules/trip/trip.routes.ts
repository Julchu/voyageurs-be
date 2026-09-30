import { type Response, type Router, Router as createRouter } from "express";
import type { AuthRequest } from "../../types";
import {
  appendToCurrentTrip,
  createTrip,
  listTrips,
  removeStop,
  reorderStops,
  setStopVisited,
  updateTrip,
} from "./trip.service.ts";
import {
  createTripBodySchema,
  publicIdSchema,
  reorderBodySchema,
  stopBodySchema,
  updateTripBodySchema,
  visitedBodySchema,
} from "./trip.validation.ts";

export const tripRouter: Router = createRouter();

const publicIdFrom = (value: string | undefined) => {
  const parsed = publicIdSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

tripRouter.get("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  try {
    const trips = await listTrips(req.userId);
    res.json({ success: true, data: trips });
  } catch (error) {
    console.error("Failed to list trips", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
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

  try {
    const trips = await createTrip(req.userId, parsed.data.name ?? "Current trip");
    res.status(201).json({ success: true, data: trips });
  } catch (error) {
    console.error("Failed to create trip", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

tripRouter.post("/current/stops", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const parsed = stopBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid stop" });
    return;
  }

  try {
    const trips = await appendToCurrentTrip(req.userId, parsed.data);
    res.status(201).json({ success: true, data: trips });
  } catch (error) {
    console.error("Failed to add stop", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
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

  try {
    const trips = await updateTrip(req.userId, publicId, parsed.data);
    if (!trips) {
      res.status(404).json({ success: false, error: "Trip not found" });
      return;
    }
    res.json({ success: true, data: trips });
  } catch (error) {
    console.error("Failed to update trip", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

tripRouter.put(
  "/:publicId/stops/order",
  async (req: AuthRequest<{ publicId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: "Invalid user ID" });
      return;
    }

    const publicId = publicIdFrom(req.params.publicId);
    if (!publicId) {
      res.status(404).json({ success: false, error: "Trip not found" });
      return;
    }

    const parsed = reorderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid stop order" });
      return;
    }

    try {
      const trips = await reorderStops(req.userId, publicId, parsed.data.publicIds);
      if (!trips) {
        res.status(404).json({ success: false, error: "Trip not found" });
        return;
      }
      if (trips === "invalid") {
        res.status(400).json({ success: false, error: "Stop order does not match this trip" });
        return;
      }
      res.json({ success: true, data: trips });
    } catch (error) {
      console.error("Failed to reorder stops", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
);

tripRouter.patch(
  "/:publicId/stops/:stopPublicId",
  async (req: AuthRequest<{ publicId: string; stopPublicId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: "Invalid user ID" });
      return;
    }

    const publicId = publicIdFrom(req.params.publicId);
    const stopPublicId = publicIdFrom(req.params.stopPublicId);
    if (!publicId || !stopPublicId) {
      res.status(404).json({ success: false, error: "Stop not found" });
      return;
    }

    const parsed = visitedBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid stop" });
      return;
    }

    try {
      const trips = await setStopVisited(req.userId, publicId, stopPublicId, parsed.data.visited);
      if (!trips) {
        res.status(404).json({ success: false, error: "Stop not found" });
        return;
      }
      res.json({ success: true, data: trips });
    } catch (error) {
      console.error("Failed to update stop", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
);

tripRouter.delete(
  "/:publicId/stops/:stopPublicId",
  async (req: AuthRequest<{ publicId: string; stopPublicId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: "Invalid user ID" });
      return;
    }

    const publicId = publicIdFrom(req.params.publicId);
    const stopPublicId = publicIdFrom(req.params.stopPublicId);
    if (!publicId || !stopPublicId) {
      res.status(404).json({ success: false, error: "Stop not found" });
      return;
    }

    try {
      const trips = await removeStop(req.userId, publicId, stopPublicId);
      if (!trips) {
        res.status(404).json({ success: false, error: "Stop not found" });
        return;
      }
      res.json({ success: true, data: trips });
    } catch (error) {
      console.error("Failed to remove stop", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
);
