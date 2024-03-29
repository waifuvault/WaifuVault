import swc from "unplugin-swc";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        unstubEnvs: true,
        globals: true,
        root: "./",
        exclude: [...configDefaults.exclude, "node_modules/*", "src/__test__"],
    },
    plugins: [
        swc.vite({
            module: {
                type: "es6",
            },
        }),
    ],
});
