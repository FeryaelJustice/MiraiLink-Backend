import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup/env.js'],
        testTimeout: 10_000,
        hookTimeout: 10_000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            include: [
                'src/middleware/**/*.js', 'src/services/**/*.js',
                'src/utils/**/*.js', 'src/validation/**/*.js', 'src/dto/**/*.js',
            ],
            exclude: ['src/assets/**'],
            thresholds: { statements: 60, branches: 45, functions: 50, lines: 60 },
        },
    },
});
