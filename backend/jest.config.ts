module.exports = {
  "testEnvironment": "node",
  "setupFiles": [
    "<rootDir>/test/setup.js"
  ],
  "collectCoverageFrom": [
    "src/**/*.js"
  ],
  "coverageThreshold": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  },
  "preset": "ts-jest"
};