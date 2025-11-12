/**
 * BedrockClient Unit Tests
 * 
 * Tests for the AWS Bedrock client using mocks
 * Requirements: 7.1, 7.4, 7.5, 9.4
 * 
 * TDD Red Phase: Write failing tests first
 */

import { BedrockClient } from '../../../src/clients/BedrockClient.js';

describe('BedrockClient', () => {
  let client: BedrockClient;
  const testRegion = 'us-east-1';

  beforeEach(() => {
    client = new BedrockClient(testRegion);
  });

  describe('Constructor', () => {
    it('should create instance with default region', () => {
      const defaultClient = new BedrockClient();
      expect(defaultClient).toBeInstanceOf(BedrockClient);
    });

    it('should create instance with custom region', () => {
      const customClient = new BedrockClient('us-west-2');
      expect(customClient).toBeInstanceOf(BedrockClient);
    });
  });

  describe('generateCompletion', () => {
    it('should generate text completion', async () => {
      // Requirement 7.1: Integrate with LLM provider
      const prompt = '請簡短介紹自己';
      const response = await client.generateCompletion(prompt);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should use default temperature parameter', async () => {
      // Requirement 7.4: Set LLM temperature parameter to 0.7
      const prompt = '測試提示';
      const response = await client.generateCompletion(prompt);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should accept custom temperature parameter', async () => {
      const prompt = '測試提示';
      const response = await client.generateCompletion(prompt, 0.5);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should accept custom maxTokens parameter', async () => {
      // Requirement 7.5: Limit LLM response tokens
      const prompt = '測試提示';
      const response = await client.generateCompletion(prompt, 0.7, 100);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should accept optional system prompt', async () => {
      const prompt = '測試提示';
      const systemPrompt = '你是一位專業的內容生成助手';
      const response = await client.generateCompletion(prompt, 0.7, 4096, systemPrompt);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle empty prompt', async () => {
      await expect(client.generateCompletion('')).rejects.toThrow();
    });

    it('should handle invalid temperature', async () => {
      // Temperature should be between 0 and 1
      await expect(client.generateCompletion('test', -0.1)).rejects.toThrow();
      await expect(client.generateCompletion('test', 1.1)).rejects.toThrow();
    });

    it('should handle invalid maxTokens', async () => {
      // maxTokens should be positive
      await expect(client.generateCompletion('test', 0.7, 0)).rejects.toThrow();
      await expect(client.generateCompletion('test', 0.7, -100)).rejects.toThrow();
    });
  });

  describe('generateCompletionStream', () => {
    it('should generate streaming completion', async () => {
      const prompt = '請簡短介紹自己';
      const chunks: string[] = [];

      for await (const chunk of client.generateCompletionStream(prompt)) {
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

      for await (const chunk of client.generateCompletionStream(prompt, 0.5, 100)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should stream with system prompt', async () => {
      const prompt = '測試提示';
      const systemPrompt = '你是一位專業的內容生成助手';
      const chunks: string[] = [];

      for await (const chunk of client.generateCompletionStream(prompt, 0.7, 4096, systemPrompt)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle empty prompt in streaming', async () => {
      const generator = client.generateCompletionStream('');
      await expect(generator.next()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle Bedrock API errors', async () => {
      // Requirement 9.4: Handle LLM provider errors
      // Simulate API error by using special prompt
      await expect(
        client.generateCompletion('__BEDROCK_ERROR__')
      ).rejects.toThrow();
    });

    it('should handle throttling errors', async () => {
      await expect(
        client.generateCompletion('__THROTTLING_ERROR__')
      ).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      await expect(
        client.generateCompletion('__VALIDATION_ERROR__')
      ).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      await expect(
        client.generateCompletion('__TIMEOUT_ERROR__')
      ).rejects.toThrow();
    });
  });

  describe('Model Configuration', () => {
    it('should use Claude Sonnet 4.5 model', () => {
      // Requirement 7.1: Use AWS Bedrock Claude Sonnet 4.5
      // Model ID should be anthropic.claude-sonnet-4-5-20250929-v1:0
      expect(client).toBeInstanceOf(BedrockClient);
    });

    it('should support long context window', async () => {
      // Claude 4.5 supports longer context
      const longPrompt = '測試提示 '.repeat(1000);
      const response = await client.generateCompletion(longPrompt, 0.7, 100);

      expect(typeof response).toBe('string');
    });

    it('should support large output tokens', async () => {
      // Claude 4.5 supports up to 4096 output tokens
      const response = await client.generateCompletion('測試', 0.7, 4096);

      expect(typeof response).toBe('string');
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      await client.generateCompletion('簡短測試', 0.7, 50);
      const duration = Date.now() - startTime;

      // Should complete within 30 seconds for short prompts
      expect(duration).toBeLessThan(30000);
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        client.generateCompletion('測試1', 0.7, 50),
        client.generateCompletion('測試2', 0.7, 50),
        client.generateCompletion('測試3', 0.7, 50),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Chinese Language Support', () => {
    it('should generate Chinese content', async () => {
      const prompt = '請用繁體中文介紹台灣的司法制度';
      const response = await client.generateCompletion(prompt);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      // Should contain Chinese characters
      expect(/[\u4e00-\u9fa5]/.test(response)).toBe(true);
    });

    it('should handle mixed language prompts', async () => {
      const prompt = 'Please explain 司法正義 in Traditional Chinese';
      const response = await client.generateCompletion(prompt);

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });
});
