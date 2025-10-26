import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescriptConfig from "eslint-config-next/typescript";

const eslintConfig = [
    ...nextConfig,
    ...nextTypescriptConfig,
    {
        ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
    },
    {
        rules: {
            curly: ["error", "all"],
        },
    },
];

export default eslintConfig;
