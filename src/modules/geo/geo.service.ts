import { z } from "zod";
import { env } from "../../env.ts";

const geoSchema = z.object({ loc: z.string().nullish() });

/** Coordinates for a public IP. A blank IP would locate this server instead of the visitor. */
export const fetchGeo = async (ip: string) => {
  const token = env.IPINFO_GEOLOCATION_API_KEY;
  if (!token) return;

  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const { loc } = geoSchema.parse(await res.json());
    const [, lat, lng] = loc?.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/) ?? [];
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
  } catch (error) {
    console.error("Error fetching geolocation", error);
  }
};
