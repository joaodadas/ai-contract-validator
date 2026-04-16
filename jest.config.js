/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Backend / service tests (node environment)
    {
      displayName: "server",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/src"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
      testMatch: ["**/__tests__/**/*.test.ts"],
      collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/app/**",
        "!src/components/**",
      ],
    },
    // Component / UI tests (jsdom environment)
    {
      displayName: "ui",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      roots: ["<rootDir>/src"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
      testMatch: ["**/__tests__/**/*.test.tsx"],
      collectCoverageFrom: [
        "src/components/**/*.tsx",
      ],
    },
  ],
};
