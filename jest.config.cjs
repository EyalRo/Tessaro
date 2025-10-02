module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/services', '<rootDir>/shared'],
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^shared/libs/database/(.+)$': '<rootDir>/shared/libs/database/src/$1',
    '^shared/libs/database$': '<rootDir>/shared/libs/database/src',
    '^shared/libs/([^/]+)/(.+)$': '<rootDir>/shared/libs/$1/src/$2',
    '^shared/libs/([^/]+)$': '<rootDir>/shared/libs/$1/src',
    '^shared/config/(.*)$': '<rootDir>/shared/config/$1'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/services/**/*.ts',
    '<rootDir>/services/**/*.tsx',
    '<rootDir>/shared/**/*.ts',
    '<rootDir>/shared/**/*.tsx',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/tests/**',
    '!<rootDir>/services/**/functions/**/src/index.ts',
    '!<rootDir>/services/**/app/vite.config.ts',
    '!<rootDir>/shared/libs/api-client/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 35,
      lines: 35,
      statements: 35
    }
  },
  reporters: ['<rootDir>/shared/testing/colorized-reporter.js']
};
