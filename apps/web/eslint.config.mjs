import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Disable the pages directory check since we're using App Router
      '@next/next/no-html-link-for-pages': 'off',
      // Disable the problematic rule that causes context.getAncestors error
      '@next/next/no-duplicate-head': 'off',
      // Disable react-hooks/exhaustive-deps due to TypeScript 5.9.2 incompatibility causing "a.getSource is not a function" error
      'react-hooks/exhaustive-deps': 'off',
    },
  },
]

export default eslintConfig
