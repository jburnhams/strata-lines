export default {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'jsdom',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^image-stitch/bundle$': '<rootDir>/node_modules/image-stitch/dist/cjs/index.cjs',
        '^jpeg-encoder$': '<rootDir>/tests/__mocks__/jpeg-encoder.ts',
        '^jpeg-encoder/pkg/jpeg_encoder\\.js$': '<rootDir>/tests/__mocks__/jpeg-encoder.ts',
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
        'node_modules/(?!(gpxparser|jsdom|parse5|@garmin/fitsdk|image-stitch|jpeg-encoder)/)',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
      testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,tsx}'],
      maxWorkers: 2,
      workerIdleMemoryLimit: '512MB',
    },
    {
      displayName: 'integration',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'jsdom',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^image-stitch/bundle$': '<rootDir>/node_modules/image-stitch/dist/cjs/index.cjs',
        '^jpeg-encoder$': '<rootDir>/tests/__mocks__/jpeg-encoder.ts',
        '^jpeg-encoder/pkg/jpeg_encoder\\.js$': '<rootDir>/tests/__mocks__/jpeg-encoder.ts',
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
        'node_modules/(?!(gpxparser|jsdom|parse5|@garmin/fitsdk|image-stitch|jpeg-encoder)/)',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx}'],
      maxWorkers: 2,
      workerIdleMemoryLimit: '512MB',
    },
  ],
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    '!src/services/db.ts',
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
};
