/**
 * LLMClientFactory Unit Tests
 * 
 * Tests for the LLM Client Factory that creates appropriate client instances
 * based on Feature Flags configuration
 * 
 * Requirements: Design Document - Feature Flag 配置
 * 
 * TDD Red Phase: Write failing tests first
 */

import { LLMClientFactory } from '../../../src/factories/LLMClientFactory.js';
import { BedrockClient } from '../../../src/clients/BedrockClient.js';
import { LangChainBedrockAdapter } from '../../../src/clients/LangChainBedrockAdapter.js';

describe('LLMClientFactory', () => {
    describe('create', () => {
        it('should create a valid ILLMClient instance', () => {
            // Act
            const client = LLMClientFactory.create();

            // Assert
            expect(client).toBeDefined();
            expect(client).toHaveProperty('generateCompletion');
            expect(client).toHaveProperty('generateCompletionStream');
        });

        it('should create client with default region', () => {
            // Act
            const client = LLMClientFactory.create();

            // Assert
            expect(client).toBeDefined();
            expect((client as any).getRegion()).toBe('us-east-1');
        });

        it('should create client with custom region', () => {
            // Arrange
            const customRegion = 'us-west-2';

            // Act
            const client = LLMClientFactory.create(customRegion);

            // Assert
            expect(client).toBeDefined();
            expect((client as any).getRegion()).toBe(customRegion);
        });

        it('should return ILLMClient interface', () => {
            // Act
            const client = LLMClientFactory.create();

            // Assert
            expect(typeof client.generateCompletion).toBe('function');
            expect(typeof client.generateCompletionStream).toBe('function');
        });
    });

    describe('createExplicit', () => {
        it('should create BedrockClient when useLangChain is false', () => {
            // Act
            const client = LLMClientFactory.createExplicit(false);

            // Assert
            expect(client).toBeInstanceOf(BedrockClient);
        });

        it('should create LangChainBedrockAdapter when useLangChain is true', () => {
            // Act
            const client = LLMClientFactory.createExplicit(true);

            // Assert
            expect(client).toBeInstanceOf(LangChainBedrockAdapter);
        });

        it('should create client with custom region', () => {
            // Arrange
            const customRegion = 'ap-northeast-1';

            // Act
            const bedrockClient = LLMClientFactory.createExplicit(false, customRegion);
            const langChainClient = LLMClientFactory.createExplicit(true, customRegion);

            // Assert
            expect((bedrockClient as any).getRegion()).toBe(customRegion);
            expect((langChainClient as any).getRegion()).toBe(customRegion);
        });
    });

    describe('getClientType', () => {
        it('should return a valid client type string', () => {
            // Act
            const clientType = LLMClientFactory.getClientType();

            // Assert
            expect(typeof clientType).toBe('string');
            expect(['BedrockClient', 'LangChainBedrockAdapter']).toContain(clientType);
        });

        it('should return consistent type with created client', () => {
            // Act
            const clientType = LLMClientFactory.getClientType();
            const client = LLMClientFactory.create();

            // Assert
            expect(client.constructor.name).toBe(clientType);
        });
    });

    describe('isUsingLangChain', () => {
        it('should return a boolean value', () => {
            // Act
            const isUsing = LLMClientFactory.isUsingLangChain();

            // Assert
            expect(typeof isUsing).toBe('boolean');
        });

        it('should match createExplicit behavior', () => {
            // Act
            const isUsing = LLMClientFactory.isUsingLangChain();
            const client = LLMClientFactory.create();

            // Assert
            if (isUsing) {
                expect(client).toBeInstanceOf(LangChainBedrockAdapter);
            } else {
                expect(client).toBeInstanceOf(BedrockClient);
            }
        });
    });

    describe('Client Functionality', () => {
        it('should create functional BedrockClient', async () => {
            // Arrange
            const client = LLMClientFactory.createExplicit(false);

            // Act
            const response = await client.generateCompletion('測試');

            // Assert
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should create functional LangChainBedrockAdapter', async () => {
            // Arrange
            const client = LLMClientFactory.createExplicit(true);

            // Act
            const response = await client.generateCompletion('測試');

            // Assert
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should support streaming with BedrockClient', async () => {
            // Arrange
            const client = LLMClientFactory.createExplicit(false);

            // Act
            const chunks: string[] = [];
            for await (const chunk of client.generateCompletionStream('測試')) {
                chunks.push(chunk);
            }

            // Assert
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should support streaming with LangChainBedrockAdapter', async () => {
            // Arrange
            const client = LLMClientFactory.createExplicit(true);

            // Act
            const chunks: string[] = [];
            for await (const chunk of client.generateCompletionStream('測試')) {
                chunks.push(chunk);
            }

            // Assert
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should handle same parameters for both implementations', async () => {
            // Arrange
            const prompt = '測試提示';
            const temperature = 0.5;
            const maxTokens = 100;
            const systemPrompt = '系統提示';

            // Act
            const bedrockResponse = await LLMClientFactory.createExplicit(false).generateCompletion(
                prompt,
                temperature,
                maxTokens,
                systemPrompt
            );
            const langChainResponse = await LLMClientFactory.createExplicit(true).generateCompletion(
                prompt,
                temperature,
                maxTokens,
                systemPrompt
            );

            // Assert
            expect(typeof bedrockResponse).toBe('string');
            expect(typeof langChainResponse).toBe('string');
            expect(bedrockResponse.length).toBeGreaterThan(0);
            expect(langChainResponse.length).toBeGreaterThan(0);
        });
    });

    describe('Consistency', () => {
        it('should create same type of client for multiple calls', () => {
            // Act
            const client1 = LLMClientFactory.create();
            const client2 = LLMClientFactory.create();

            // Assert
            expect(client1.constructor.name).toBe(client2.constructor.name);
        });

        it('should create different instances for each call', () => {
            // Act
            const client1 = LLMClientFactory.create();
            const client2 = LLMClientFactory.create();

            // Assert
            expect(client1).not.toBe(client2); // Different instances
        });

        it('should create consistent client type with getClientType', () => {
            // Act
            const clientType = LLMClientFactory.getClientType();
            const client = LLMClientFactory.create();

            // Assert
            expect(client.constructor.name).toBe(clientType);
        });
    });

    describe('Interface Compatibility', () => {
        it('should have same interface for both implementations', () => {
            // Arrange
            const bedrockClient = LLMClientFactory.createExplicit(false);
            const langChainClient = LLMClientFactory.createExplicit(true);

            // Assert - both should have the same methods
            expect(typeof bedrockClient.generateCompletion).toBe('function');
            expect(typeof bedrockClient.generateCompletionStream).toBe('function');
            expect(typeof langChainClient.generateCompletion).toBe('function');
            expect(typeof langChainClient.generateCompletionStream).toBe('function');
        });

        it('should accept same parameters for both implementations', async () => {
            // Arrange
            const params = {
                prompt: '測試',
                temperature: 0.7,
                maxTokens: 100,
                systemPrompt: '系統提示'
            };

            // Act & Assert - both should accept the same parameters without errors
            await expect(
                LLMClientFactory.createExplicit(false).generateCompletion(
                    params.prompt,
                    params.temperature,
                    params.maxTokens,
                    params.systemPrompt
                )
            ).resolves.toBeDefined();

            await expect(
                LLMClientFactory.createExplicit(true).generateCompletion(
                    params.prompt,
                    params.temperature,
                    params.maxTokens,
                    params.systemPrompt
                )
            ).resolves.toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle errors consistently across implementations', async () => {
            // Arrange
            const bedrockClient = LLMClientFactory.createExplicit(false);
            const langChainClient = LLMClientFactory.createExplicit(true);

            // Act & Assert - both should throw on empty prompt
            await expect(bedrockClient.generateCompletion('')).rejects.toThrow();
            await expect(langChainClient.generateCompletion('')).rejects.toThrow();
        });

        it('should handle invalid parameters consistently', async () => {
            // Arrange
            const bedrockClient = LLMClientFactory.createExplicit(false);
            const langChainClient = LLMClientFactory.createExplicit(true);

            // Act & Assert - both should throw on invalid temperature
            await expect(bedrockClient.generateCompletion('test', -0.1)).rejects.toThrow();
            await expect(langChainClient.generateCompletion('test', -0.1)).rejects.toThrow();
        });
    });
});
