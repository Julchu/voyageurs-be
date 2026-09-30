import { type Router, Router as createRouter } from "express";
import { clientIp, isPublicIp, normalizeIp } from "../../utils/client-ip.ts";
import { fetchGeo } from "../../utils/geo.ts";

export const geoRouter: Router = createRouter();

geoRouter.post("/", async (req, res) => {
  const fromRequest = clientIp(req);
  const fromBody =
    !fromRequest && process.env.NODE_ENV === "development" && typeof req.body?.ip === "string"
      ? req.body.ip
      : undefined;
  const ip = fromRequest ?? (fromBody && isPublicIp(fromBody) ? normalizeIp(fromBody) : undefined);

  if (!ip) {
    res.status(404).json({ success: false, error: "Client IP unavailable" });
    return;
  }

  const geo = await fetchGeo(ip);

  if (!geo) {
    res.status(404).json({ success: false, error: "Geolocation unavailable" });
    return;
  }

  res.json({ success: true, data: geo });
});
