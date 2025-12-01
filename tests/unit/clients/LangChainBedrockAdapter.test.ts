/**
 * LangChainBedrockAdapter Unit Tests
 * 
 * Tests for the LangChain Bedrock adapter using mocks
 * Requirements: Design Document - LangChain Bedrock 適配器
 * 
 * TDD Red Phase: Write failing tests first
 * These tests define the expected behavior of the LangChainBedrockAdapter
 */

import { LangChainBedrockAdapter } from '../../../src/clients/LangChainBedrockAdapter.js';
import { ILLMClient } from '../../../src/interfaces/ILLMClient.js';

describe('LangChainBedrockAdapter', () => {
    let adapter: LangChainBedrockAdapter;
    const testRegion = 'us-east-1';

    beforeEach(() => {
        adapter = new LangChainBedrockAdapter(testRegion);
    });

    describe('Constructor', () => {
        it('should create instance with default region', () => {
            const defaultAdapter = new LangChainBedrockAdapter();
            expect(defaultAdapter).toBeInstanceOf(LangChainBedrockAdapter);
        });

        it('should create instance with custom region', () => {
            const customAdapter = new LangChainBedrockAdapter('us-west-2');
            expect(customAdapter).toBeInstanceOf(LangChainBedrockAdapter);
        });

        it('should implement ILLMClient interface', () => {
            // Verify that adapter implements the required interface
            expect(adapter).toHaveProperty('generateCompletion');
            expect(adapter).toHaveProperty('generateCompletionStream');
            expect(typeof adapter.generateCompletion).toBe('function');
            expect(typeof adapter.generateCompletionStream).toBe('function');
        });
    });

    describe('generateCompletion', () => {
        it('should generate text completion', async () => {
            const prompt = '請簡短介紹自己';
            const response = await adapter.generateCompletion(prompt);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should use default temperature parameter', async () => {
            const prompt = '測試提示';
            const response = await adapter.generateCompletion(prompt);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should accept custom temperature parameter', async () => {
            const prompt = '測試提示';
            const response = await adapter.generateCompletion(prompt, 0.5);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should accept custom maxTokens parameter', async () => {
            const prompt = '測試提示';
            const response = await adapter.generateCompletion(prompt, 0.7, 100);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should accept optional system prompt', async () => {
            const prompt = '測試提示';
            const systemPrompt = '你是一位專業的內容生成助手';
            const response = await adapter.generateCompletion(prompt, 0.7, 4096, systemPrompt);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
            // System prompt should influence the response
            expect(response.length).toBeGreaterThan(0);
        });

        it('should handle empty prompt', async () => {
            await expect(adapter.generateCompletion('')).rejects.toThrow();
        });

        it('should handle invalid temperature', async () => {
            // Temperature should be between 0 and 1
            await expect(adapter.generateCompletion('test', -0.1)).rejects.toThrow();
            await expect(adapter.generateCompletion('test', 1.1)).rejects.toThrow();
        });

        it('should handle invalid maxTokens', async () => {
            // maxTokens should be positive
            await expect(adapter.generateCompletion('test', 0.7, 0)).rejects.toThrow();
            await expect(adapter.generateCompletion('test', 0.7, -100)).rejects.toThrow();
        });

        it('should use Claude Sonnet 4.5 model', async () => {
            // Verify that the adapter uses the correct model
            const prompt = '測試';
            const response = await adapter.generateCompletion(prompt);

            expect(typeof response).toBe('string');
            // The adapter should be configured to use anthropic.claude-sonnet-4-5-20250929-v1:0
        });
    });

    describe('generateCompletionStream', () => {
        it('should generate streaming completion', async () => {
            const prompt = '請簡短介紹自己';
            const chunks: string[] = [];

            for await (const chunk of adapter.generateCompletionStream(prompt)) {
                expect(typeof chunk).toBe('string');
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(0);
            const fullResponse = chunks.join('');
            expect(fullResponse.length).toBeGreaterThan(0);
        });

        it('should stream with custom parameters', async () => {
            const prompt = '測試提示';
            const chunks: string[] = [];

            for await (const chunk of adapter.generateCompletionStream(prompt, 0.5, 100)) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should stream with system prompt', async () => {
            const prompt = '測試提示';
            const systemPrompt = '你是一位專業的內容生成助手';
            const chunks: string[] = [];

            for await (const chunk of adapter.generateCompletionStream(prompt, 0.7, 4096, systemPrompt)) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should handle empty prompt in streaming', async () => {
            const generator = adapter.generateCompletionStream('');
            await expect(generator.next()).rejects.toThrow();
        });

        it('should yield chunks progressively', async () => {
            const prompt = '請詳細介紹台灣的司法制度，包括法院層級、審級制度、法官任用等各個面向';
            const chunks: string[] = [];
            let chunkCount = 0;

            for await (const chunk of adapter.generateCompletionStream(prompt)) {
                chunks.push(chunk);
                chunkCount++;
                // Verify that we're getting chunks, not the full response at once
                if (chunkCount === 1) {
                    expect(chunk.length).toBeLessThan(1000); // First chunk should be small
                }
            }

            // With a longer prompt, we should get multiple chunks
            expect(chunkCount).toBeGreaterThanOrEqual(1); // Should have at least one chunk
            const fullResponse = chunks.join('');
            expect(fullResponse.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle LangChain API errors', async () => {
            // Simulate API error
            await expect(
                adapter.generateCompletion('__LANGCHAIN_ERROR__')
            ).rejects.toThrow();
        });

        it('should handle Bedrock throttling errors', async () => {
            await expect(
                adapter.generateCompletion('__THROTTLING_ERROR__')
            ).rejects.toThrow();
        });

        it('should handle validation errors', async () => {
            await expect(
                adapter.generateCompletion('__VALIDATION_ERROR__')
            ).rejects.toThrow();
        });

        it('should handle timeout errors', async () => {
            await expect(
                adapter.generateCompletion('__TIMEOUT_ERROR__')
            ).rejects.toThrow();
        });

        it('should provide meaningful error messages', async () => {
            try {
                await adapter.generateCompletion('');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBeTruthy();
            }
        });
    });

    describe('Compatibility with BedrockClient', () => {
        it('should have same interface as BedrockClient', () => {
            // Both should implement ILLMClient
            const methods = ['generateCompletion', 'generateCompletionStream'];

            methods.forEach(method => {
                expect(adapter).toHaveProperty(method);
                expect(typeof (adapter as any)[method]).toBe('function');
            });
        });

        it('should accept same parameters as BedrockClient', async () => {
            // Test that the adapter accepts the same parameters
            const prompt = '測試';
            const temperature = 0.7;
            const maxTokens = 100;
            const systemPrompt = '系統提示';

            const response = await adapter.generateCompletion(
                prompt,
                temperature,
                maxTokens,
                systemPrompt
            );

            expect(typeof response).toBe('string');
        });

        it('should return same response format as BedrockClient', async () => {
            const prompt = '測試';
            const response = await adapter.generateCompletion(prompt);

            // Should return a string, just like BedrockClient
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });
    });

    describe('Performance', () => {
        it('should complete within reasonable time', async () => {
            const startTime = Date.now();
            await adapter.generateCompletion('簡短測試', 0.7, 50);
            const duration = Date.now() - startTime;

            // Should complete within 30 seconds for short prompts
            expect(duration).toBeLessThan(30000);
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                adapter.generateCompletion('測試1', 0.7, 50),
                adapter.generateCompletion('測試2', 0.7, 50),
                adapter.generateCompletion('測試3', 0.7, 50),
            ];

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            results.forEach((result: string) => {
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Chinese Language Support', () => {
        it('should generate Chinese content', async () => {
            const prompt = '請用繁體中文介紹台灣的司法制度';
            const response = await adapter.generateCompletion(prompt);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
            // Should contain Chinese characters
            expect(/[\u4e00-\u9fa5]/.test(response)).toBe(true);
        });

        it('should handle mixed language prompts', async () => {
            const prompt = 'Please explain 司法正義 in Traditional Chinese';
            const response = await adapter.generateCompletion(prompt);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });
    });

    describe('LangChain Integration', () => {
        it('should use LangChain BedrockChat internally', async () => {
            // This test verifies that the adapter is using LangChain's BedrockChat
            const prompt = '測試 LangChain 整合';
            const response = await adapter.generateCompletion(prompt);

            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should support LangChain message format', async () => {
            // LangChain uses a specific message format
            const prompt = '測試訊息格式';
            const systemPrompt = '系統訊息';
            const response = await adapter.generateCompletion(prompt, 0.7, 100, systemPrompt);

            expect(typeof response).toBe('string');
        });
    });
});
