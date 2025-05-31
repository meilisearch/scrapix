import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tseslintParser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import jest from 'eslint-plugin-jest'

const config = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'examples/**',
      'scripts/**',
      'tests/env/**',
      'coverage/**',
      'playground/**'
    ]
  },
  eslint.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly'
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'module',
      parser: tseslintParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        projectFolderIgnoreList: ['dist']
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        setInterval: 'readonly',
        fetch: 'readonly',
        NodeJS: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'prettier': prettier,
      'jest': jest
    },
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
          printWidth: 80
        }
      ],
      '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'comma-dangle': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }]
    }
  }
]

export default config 