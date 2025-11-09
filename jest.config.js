export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(gpxparser|jsdom|parse5|@garmin/fitsdk)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    '!services/db.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 85,
      branches: 70,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
};
