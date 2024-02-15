// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

export default {
    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // An array of file extensions your modules use
    moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "node"],

    // The test environment that will be used for testing
    testEnvironment: "node",
    testEnvironmentOptions: {
        loader: 'ts-node/esm'
    },

    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    // The glob patterns Jest uses to detect test files
    testMatch: ["**/src/**/__tests__/**/*.[jt]s?(x)", "**/src/**/?(*.)+(spec|test).[tj]s?(x)"],
    // A map from regular expressions to paths to transformers
    transform: {
        "\\.(ts)$": ["ts-jest",{useESM:true}]
    },
    verbose: true,
    testPathIgnorePatterns: ["/node_modules/", "/src/__test__/"]
};
