import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.vitest.ts'],
        exclude: ['node_modules', 'dist'],
        testTimeout: 60000, // 60 seconds for LLM calls
        hookTimeout: 60000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/index.ts'
            ]
        }
    }
});
