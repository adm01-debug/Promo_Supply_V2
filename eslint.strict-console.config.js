import { Linter } from 'eslint';

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
] as Linter.FlatConfig[];
