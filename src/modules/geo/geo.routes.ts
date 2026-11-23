import { Router } from "express";
import { env } from "../../env.ts";
import { requireUser } from "../../middleware/require-user.ts";
import { notFound } from "../../lib/errors.ts";
import { clientIp, publicIp } from "../../utils/client-ip.ts";
import { fetchGeo } from "./geo.service.ts";

export const geoRouter: Router = Router();

// Local requests come from a private address, so development may send a public one.
const devIp = (value: unknown) =>
  env.NODE_ENV === "development" && typeof value === "string" ? publicIp(value) : undefined;

geoRouter.post(
  "/",
  requireUser(async (req, res) => {
    const ip = clientIp(req) ?? devIp(req.body?.ip);
    if (!ip) throw notFound("Client IP unavailable");

    const geo = await fetchGeo(ip);
    if (!geo) throw notFound("Geolocation unavailable");

    res.json({ success: true, data: geo });
  }),
);
