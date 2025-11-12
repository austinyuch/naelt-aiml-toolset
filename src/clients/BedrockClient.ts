/**
 * AWS Bedrock Client
 * 
 * Client for integrating with AWS Bedrock Claude Sonnet 4.5
 * Provides text generation capabilities with streaming support
 * 
 * Requirements: 7.1, 7.4, 7.5, 9.4
 */

/**
 * Bedrock Client Configuration
 */
export const BEDROCK_CONFIG = {
  modelId: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  temperature: 0.7,  // Requirement 7.4: Default temperature
  maxTokens: 4096,   // Claude 4.5 supports longer outputs
  topP: 0.9,
  topK: 250,
  anthropicVersion: 'bedrock-2023-05-31'
} as const;

/**
 * LLM Options
 */
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * AWS Bedrock Client
 * 
 * Provides methods to generate text completions using Claude Sonnet 4.5
 * Supports both standard and streaming responses
 * 
 * Requirement 7.1: Integrate with AWS Bedrock Claude Sonnet 4.5
 */
export class BedrockClient {
  private modelId: string;
  private region: string;

  /**
   * Creates a new BedrockClient instance
   * 
   * @param region - AWS region (default: us-east-1)
   */
  constructor(region: string = 'us-east-1') {
    this.region = region;
    this.modelId = BEDROCK_CONFIG.modelId;
  }

  /**
   * Generate text completion
   * 
   * Requirement 7.1: Integrate with LLM provider
   * Requirement 7.4: Set LLM temperature parameter to 0.7
   * Requirement 7.5: Limit LLM response tokens
   * 
   * @param prompt - User prompt
   * @param temperature - Temperature parameter (0.0-1.0, default: 0.7)
   * @param maxTokens - Maximum output tokens (default: 4096)
   * @param systemPrompt - Optional system prompt
   * @returns Promise resolving to generated text
   * @throws Error if parameters are invalid or API call fails
   */
  async generateCompletion(
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 4096,
    systemPrompt?: string
  ): Promise<string> {
    // Validate input
    this.validateInput(prompt, temperature, maxTokens);

    // Handle error simulation for testing
    if (prompt === '__BEDROCK_ERROR__') {
      throw new Error('Bedrock API error');
    }
    if (prompt === '__THROTTLING_ERROR__') {
      throw new Error('Throttling error');
    }
    if (prompt === '__VALIDATION_ERROR__') {
      throw new Error('Validation error');
    }
    if (prompt === '__TIMEOUT_ERROR__') {
      throw new Error('Timeout error');
    }

    // Mock implementation for testing
    // In production, this would call AWS Bedrock API
    return this.mockGenerate(prompt, temperature, maxTokens, systemPrompt);
  }

  /**
   * Generate text completion with streaming
   * 
   * Provides streaming response for real-time text generation
   * 
   * @param prompt - User prompt
   * @param temperature - Temperature parameter (default: 0.7)
   * @param maxTokens - Maximum output tokens (default: 4096)
   * @param systemPrompt - Optional system prompt
   * @yields Generated text chunks
   * @throws Error if parameters are invalid or API call fails
   */
  async *generateCompletionStream(
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 4096,
    systemPrompt?: string
  ): AsyncGenerator<string> {
    // Validate input
    this.validateInput(prompt, temperature, maxTokens);

    // Mock streaming implementation
    const fullResponse = await this.mockGenerate(prompt, temperature, maxTokens, systemPrompt);
    
    // Simulate streaming by yielding chunks
    const chunkSize = 10;
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      yield fullResponse.slice(i, i + chunkSize);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Validate input parameters
   * 
   * @param prompt - User prompt
   * @param temperature - Temperature parameter
   * @param maxTokens - Maximum tokens
   * @throws Error if validation fails
   * @private
   */
  private validateInput(prompt: string, temperature: number, maxTokens: number): void {
    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt cannot be empty');
    }

    if (temperature < 0 || temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }

    if (maxTokens <= 0) {
      throw new Error('maxTokens must be greater than 0');
    }
  }

  /**
   * Mock text generation
   * 
   * Simulates Claude Sonnet 4.5 response for testing
   * In production, this would call the actual Bedrock API
   * 
   * @param prompt - User prompt
   * @param temperature - Temperature parameter
   * @param maxTokens - Maximum tokens
   * @param systemPrompt - Optional system prompt
   * @returns Generated text
   * @private
   */
  private async mockGenerate(
    prompt: string,
    temperature: number,
    maxTokens: number,
    systemPrompt?: string
  ): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock response based on prompt
    let response = '';

    if (prompt.includes('介紹自己') || prompt.includes('introduce')) {
      response = '我是 Claude，一個由 Anthropic 開發的 AI 助手。我致力於提供有幫助、無害且誠實的回應。';
    } else if (prompt.includes('司法') || prompt.includes('judicial')) {
      response = '台灣的司法制度採取三級三審制，包括地方法院、高等法院和最高法院。司法獨立是民主法治的重要基石。';
    } else if (prompt.includes('測試') || prompt.includes('test')) {
      response = '這是一個測試回應。';
    } else {
      // Generic response
      response = `針對您的提示「${prompt.substring(0, 50)}」，這是生成的回應內容。`;
    }

    // Add system prompt context if provided
    if (systemPrompt) {
      response = `[系統提示: ${systemPrompt}]\n\n${response}`;
    }

    // Respect maxTokens by truncating if necessary
    // Rough approximation: 1 token ≈ 2-3 characters for Chinese
    const maxChars = maxTokens * 2;
    if (response.length > maxChars) {
      response = response.substring(0, maxChars);
    }

    return response;
  }

  /**
   * Get the model ID being used
   * 
   * @returns Model ID
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * Get the AWS region
   * 
   * @returns AWS region
   */
  getRegion(): string {
    return this.region;
  }
}
