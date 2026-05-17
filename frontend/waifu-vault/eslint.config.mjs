import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescriptConfig from "eslint-config-next/typescript";

const eslintConfig = [
    ...nextConfig,
    ...nextTypescriptConfig,
    {
        ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
    },
    {
        settings: {
            react: {
                version: "19.2",
            },
        },
    },
    {
        rules: {
            curly: ["error", "all"],
            "react-hooks/set-state-in-effect": "off",
        },
    },
];

export default eslintConfig;
