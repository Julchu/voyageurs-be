import { isPublicIp, normalizeIp } from "./client-ip.ts";

export const fetchGeo = async (ip?: string) => {
  // An empty ipinfo path geolocates this server, which is the container or host, not the visitor.
  if (!ip || !isPublicIp(ip) || !process.env.IPINFO_GEOLOCATION_API_KEY) return;

  try {
    const url = `https://ipinfo.io/${normalizeIp(ip)}?token=${process.env.IPINFO_GEOLOCATION_API_KEY}`;
    const res = await fetch(new URL(url).href);
    const geolocation = (await res.json()) as { loc?: string };
    if (!geolocation.loc || geolocation.loc.length <= 1) return;

    const [lat, lng] = geolocation.loc.split(",");
    if (!lat || !lng) return;

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

    return { lat: latitude, lng: longitude };
  } catch (error) {
    console.error("Error fetching geolocation", error);
  }
};
