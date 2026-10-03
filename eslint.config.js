import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: [
      'dist',
      'embed-dist',
      'server/**',
      'scripts/**',
      'storage/**',
      // Código de terceros: skills instalados y el decoder Draco vendorizado.
      '.cursor/**',
      '.agents/**',
      '.claude/**',
      'public/**',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Mayúscula = componente JSX (`as: Tag`): el core no ve el uso en JSX.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Dominio puro: lo importan el front y el servidor (Node). Nada de UI,
    // motores de animación ni globals del browser.
    files: ['src/domain/**/*.js'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*'], message: 'src/domain no depende de React.' },
            { group: ['gsap', 'gsap/*', 'lenis', 'three', 'three/*', 'motion', 'motion/*'], message: 'src/domain no depende de motores de UI.' },
            { group: ['**/components/**', '**/pages/**', '**/hooks/**', '**/server/**'], message: 'src/domain no importa capas de arriba.' },
          ],
        },
      ],
    },
  },
]
