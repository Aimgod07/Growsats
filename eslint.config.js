import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', 'node_modules', '.wrangler', '.artifacts', 'feature-release', 'public/grogames/vendor', 'public/grogames/**/assets']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['src/components/ui/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['public/grogames/**/*.js'],
    languageOptions: {
      globals: Object.fromEntries(['ArcadeSession','Art','CloudSkipper','Football','FootballEnvironment','FootballModels','GameCatalog','Games','GroCollection','GroFactories','GroMaterials','GroStudio','Matter','NeonRace','NeonRenderer','PlaylootScores','Saltwake','StrikeAudio','StrikeCatalog','StrikeEngine','StrikeModels','THREE','module','require'].map(name => [name, 'readonly'])),
    },
  },
  {
    // Test files run under vitest/node, so they get Node globals and JSX
    // without an explicit React import (the automatic runtime is enabled).
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    },
  },
])
