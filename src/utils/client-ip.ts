import type { Request } from "express";
import { BlockList, isIP } from "node:net";

const PRIVATE_RANGES = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "::/128",
  "::1/128",
  "fc00::/7",
  "fe80::/10",
];

const privateIps = new BlockList();
for (const range of PRIVATE_RANGES) {
  const [network = "", prefix] = range.split("/");
  privateIps.addSubnet(network, Number(prefix), isIP(network) === 6 ? "ipv6" : "ipv4");
}

/** The address without brackets or an IPv4-mapped prefix, if it's public. */
export const publicIp = (value: string) => {
  const ip = value
    .trim()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/^::ffff:(?=\d+\.)/i, "");
  const family = isIP(ip);
  if (family && !privateIps.check(ip, family === 4 ? "ipv4" : "ipv6")) return ip;
};

// req.ip / req.ips already apply Express's trust proxy setting. Reading
// X-Forwarded-For directly would let a client spoof its address.
export const clientIp = (req: Request) => [...req.ips, req.ip ?? ""].map(publicIp).find(Boolean);
