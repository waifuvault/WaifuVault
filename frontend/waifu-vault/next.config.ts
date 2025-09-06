import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    productionBrowserSourceMaps: false,
    turbopack: {
        root: `${process.cwd()}`,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "waifuvault.moe",
                port: "",
                pathname: "/**",
            },
        ],
    },
    allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS?.split(",") ?? ["127.0.0.1"],
};

export default nextConfig;
