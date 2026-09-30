import { defineConfig, type Plugin } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

const resolveJsToTs: Plugin = {
    name: "resolve-js-to-ts",
    enforce: "pre",
    resolveId(source: string, importer: string | undefined): string | null {
        if (importer && /^\.\.?\//.test(source) && source.endsWith(".js")) {
            const tsPath = path.resolve(path.dirname(importer), source.replace(/\.js$/, ".ts"));
            if (fs.existsSync(tsPath)) {
                return tsPath;
            }
        }
        return null;
    },
};

export default defineConfig({
    oxc: {
        decorator: {
            legacy: true,
            emitDecoratorMetadata: true,
        },
        typescript: {
            removeClassFieldsWithoutInitializer: true,
        },
        assumptions: {
            setPublicClassFields: true,
        },
    },
    plugins: [resolveJsToTs],
    test: {
        include: ["src/**/__TEST__/**/*.spec.ts"],
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
