// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["src/migrations/sqlite/**/*", "src/migrations/postgres/**/*", "**/*.mjs", "frontend/**/*"],
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
            "@typescript-eslint/no-loss-of-precision": "error",
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
            "@typescript-eslint/no-var-requires": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "objectLiteralProperty",
                    format: null,
                },
                {
                    selector: "default",
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                    trailingUnderscore: "allow",
                },
                {
                    selector: "import",
                    format: ["camelCase", "PascalCase"],
                },
                {
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE"],
                    leadingUnderscore: "allow",
                    trailingUnderscore: "allow",
                },
                {
                    selector: "enumMember",
                    format: ["UPPER_CASE"],
                },
                {
                    selector: "typeLike",
                    format: ["PascalCase"],
                },
            ],
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                {
                    accessibility: "explicit",
                },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
        },
    },
);
