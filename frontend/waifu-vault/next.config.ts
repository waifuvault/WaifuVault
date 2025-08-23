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
};

export default nextConfig;
