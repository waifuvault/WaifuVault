// vitest.config.ts
import swc from "unplugin-swc";
import { configDefaults, defineConfig } from "vitest/config";
import { nodeLoaderPlugin } from "@vavite/node-loader/plugin";

export default defineConfig({
    test: {
        globals: true,
        root: "./",
        exclude: [...configDefaults.exclude, "node_modules/*", "src/__test__"],
    },
    plugins: [
        nodeLoaderPlugin(),
        swc.vite({
            module: { type: "es6" },
        }),
    ],
});
