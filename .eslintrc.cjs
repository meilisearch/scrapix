module.exports = {
  env: {
    browser: true,
    es6: true,
    es2020: true,
    'jest/globals': true,
    node: true,
    jasmine: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    project: ['tsconfig.eslint.json'],
    sourceType: 'module',
    projectFolderIgnoreList: ['dist'],
  },
  plugins: ['@typescript-eslint', 'prettier', 'jest'],
  rules: {
    'no-dupe-class-members': 'off', // Off due to conflict with typescript overload functions
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        arrowParens: 'always',
        semi: false,
        bracketSpacing: true,
        trailingComma: 'es5',
        tsdoc: true,
        printWidth: 80,
      },
    ],
    '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
    '@typescript-eslint/return-await': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'none', // 'none' or 'semi' or 'comma'
          requireLast: true,
        },
        singleline: {
          delimiter: 'semi', // 'semi' or 'comma'
          requireLast: false,
        },
      },
    ],
    'comma-dangle': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/no-misused-promises': ['off'],
    '@typescript-eslint/no-unsafe-member-access': ['off'],
    '@typescript-eslint/no-unsafe-argument': 'off',
  },
}
