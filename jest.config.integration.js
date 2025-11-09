import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/progress-callbacks.test.ts'],
};
