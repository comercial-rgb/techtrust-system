/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  watchman: false,
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
};
