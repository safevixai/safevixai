// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/e2e/',
    '<rootDir>/tests/a11y/',
    '<rootDir>/tests/api-contract.spec.ts',
    '<rootDir>/hooks/__tests__/useSOS.test.ts',
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/components/__tests__/test-utils.tsx',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!components/**/*.stories.*',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!components/maps/**',
    '!lib/duckdb-challan.ts',
    '!lib/offline-ai.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 56,
      functions: 62,
      lines: 70,
      statements: 66,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
