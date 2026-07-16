import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['node_modules/**', 'coverage/**', 'src/assets/**'] },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
            'preserve-caught-error': 'off',
        },
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    },
];
