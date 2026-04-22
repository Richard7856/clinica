import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fija la raíz del workspace a este directorio. Sin esto, Next detecta
  // el package-lock.json del home del usuario y asume monorepo por error.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
