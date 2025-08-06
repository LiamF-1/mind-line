module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  root: true,
  env: {
    node: true,
    browser: true,
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    '*.config.js',
    '*.config.ts',
    '*.config.mjs',
  ],
}
