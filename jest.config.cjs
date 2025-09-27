module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/apps', '<rootDir>/libs'],
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/apps/**/*.ts',
    '<rootDir>/apps/**/*.tsx',
    '<rootDir>/libs/**/*.ts',
    '<rootDir>/libs/**/*.tsx',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/tests/**',
    '!<rootDir>/apps/functions/**/src/index.ts',
    '!<rootDir>/apps/**/vite.config.ts',
    '!<rootDir>/libs/api-client/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 35,
      lines: 35,
      statements: 35
    }
  }
};
