module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  root: true,
  env: {
    node: true,
    browser: true,
  },
  rules: {
    // Disable the pages directory check since we're using App Router
    '@next/next/no-html-link-for-pages': 'off',
    // Disable the problematic duplicate head rule for now
    '@next/next/no-duplicate-head': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    '*.config.js',
    '*.config.ts',
    '*.config.mjs',
    '**/prisma/**',
  ],
}
