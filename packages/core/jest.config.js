/**
 * Jest config for @easyeng/core.
 *
 * The package had no test runner wired up; its `.test.ts` files were dormant
 * (turbo skipped the package for lack of a `test` script). This config runs them.
 *
 * testEnvironment 'jsdom' + @babel/preset-react: the two hook tests
 * (useScheduleDraft, useSlotSelection) render hooks via @testing-library/react's
 * `renderHook`, which needs a DOM (jsdom) and react-dom. preset-react transforms
 * the JSX in any React test/helper code.
 *
 * moduleNameMapper: useScheduleDraft.test.ts `jest.mock('@/lib/supabase/client')`
 * — the pre-refactor web alias. In core the hook imports `../adapters/supabase`,
 * so we map that stale alias onto the real core adapter module so the mock applies.
 */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/lib/supabase/client$': '<rootDir>/src/adapters/supabase',
    // Pin react + react-dom to a single resolved copy. Under pnpm, core and
    // @testing-library/react otherwise resolve React via different paths (the
    // .pnpm virtual store vs the hoisted top-level), yielding two React
    // instances and a null hook dispatcher ("Invalid hook call").
    '^react$': '<rootDir>/../../node_modules/react',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom',
    '^react/(.*)$': '<rootDir>/../../node_modules/react/$1',
    '^react-dom/(.*)$': '<rootDir>/../../node_modules/react-dom/$1',
  },
  transformIgnorePatterns: [],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      {
        babelrc: false,
        presets: [
          '@babel/preset-typescript',
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },
};
