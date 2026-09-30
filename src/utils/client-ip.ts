import type { Request } from "express";

export const normalizeIp = (value: string) => {
  let ip = value.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice("::ffff:".length);
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  return ip;
};

export const isPublicIp = (value: string) => {
  const ip = normalizeIp(value);
  if (!/^[0-9a-fA-F:.]+$/.test(ip)) return false;
  if (ip === "::1" || ip === "0.0.0.0") return false;

  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const parts = [v4[1], v4[2], v4[3], v4[4]].map((part) => Number(part));
    if (parts.some((part) => part === undefined || Number.isNaN(part) || part > 255)) return false;

    const a = parts[0];
    const b = parts[1];
    if (a === undefined || b === undefined) return false;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }

  if (!ip.includes(":")) return false;

  const lower = ip.toLowerCase();
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return false;
  return true;
};

// req.ip / req.ips already apply Express trust proxy. Reading X-Forwarded-For
// directly would let a client spoof an address when nothing sits in front of the API.
export const clientIp = (req: Request) => {
  const candidates = req.ip ? [...req.ips, req.ip] : [...req.ips];

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (isPublicIp(ip)) return ip;
  }
};
