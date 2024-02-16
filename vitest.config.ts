import { configDefaults,defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, "node_modules/*", "src/__test__"],
    },
});