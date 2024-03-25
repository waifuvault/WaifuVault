// vitest.config.ts
import { configDefaults, defineConfig } from "vitest/config";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
    test: {
        globals: true,
        root: "./",
        exclude: [...configDefaults.exclude, "node_modules/*", "src/__test__"],
    },
    plugins: [typescript()],
    esbuild: false,
});
