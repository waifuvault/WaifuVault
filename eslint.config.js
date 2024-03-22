// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["src/migrations/**/*", "**/*.mjs"],
    },
    {
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: true,
            },
        },
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.ts"],
        rules: {
            // common
            "no-return-await": "error",
            "no-unreachable-loop": "error",
            "no-promise-executor-return": "off",
            "no-unsafe-optional-chaining": "error",
            "no-useless-backreference": "error",
            "require-atomic-updates": "off",
            "require-await": "error",
            "no-await-in-loop": "off",
            "spaced-comment": "error",
            "no-unused-vars": "off",
            curly: "error",
            semi: "error",
            camelcase: "off",
            // TypeScript
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-loss-of-precision": "error",
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
            "@typescript-eslint/no-var-requires": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/ban-types": "warn",
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                {
                    accessibility: "explicit",
                },
            ],
        },
    },
);
