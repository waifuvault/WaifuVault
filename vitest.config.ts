import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/__TEST__/**/*.spec.ts"],
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
