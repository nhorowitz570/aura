import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin workspace root so Turbopack doesn't pick up the stray ~/package-lock.json
  turbopack: {
    root: process.cwd(),
  },
  // Dev-only: allow any LAN / tailnet / loopback origin to load HMR + dev assets.
  // Mix of explicit hosts and wildcards because Next 16's CIDR support is inconsistent.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.2.0.2",
    "100.111.236.31",   // Mobile / Tailscale
    "100.64.80.41",     // Tailnet (existing)
    "10.*",
    "172.16.*",
    "172.17.*",
    "172.18.*",
    "172.19.*",
    "172.2*.*",
    "172.30.*",
    "172.31.*",
    "192.168.*",
    "100.*",            // CG-NAT / Tailscale
    "*.local",          // mDNS
    "*.ts.net",         // Tailscale MagicDNS
  ],
};

export default nextConfig;
