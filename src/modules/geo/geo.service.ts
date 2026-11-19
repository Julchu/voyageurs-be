/** Coordinates for a public IP. A blank IP would locate this server instead of the visitor. */
export const fetchGeo = async (ip: string) => {
  const token = process.env.IPINFO_GEOLOCATION_API_KEY;
  if (!token) return;

  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const { loc } = (await res.json()) as { loc?: string };
    const [, lat, lng] = loc?.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/) ?? [];
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
  } catch (error) {
    console.error("Error fetching geolocation", error);
  }
};
