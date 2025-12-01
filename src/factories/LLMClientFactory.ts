/**
 * LLM Client Factory
 * 
 * Factory pattern implementation for creating LLM client instances.
 * Selects between BedrockClient and LangChainBedrockAdapter based on
 * Feature Flag configuration.
 * 
 * Requirements: Design Document - Feature Flag 配置
 * 
 * Usage:
 * ```typescript
 * // Create client based on feature flags
 * const client = LLMClientFactory.create();
 * 
 * // Create client with custom region
 * const client = LLMClientFactory.create('us-west-2');
 * 
 * // Check which client type will be created
 * const clientType = LLMClientFactory.getClientType();
 * ```
 * 
 * Feature Flag Behavior:
 * - FEATURE_LANGCHAIN_AGENT=true → LangChainBedrockAdapter
 * - FEATURE_LANGCHAIN_AGENT=false → BedrockClient (default)
 * - No environment variable → BedrockClient (default)
 */

import { ILLMClient } from '../interfaces/ILLMClient.js';
import { BedrockClient } from '../clients/BedrockClient.js';
import { LangChainBedrockAdapter } from '../clients/LangChainBedrockAdapter.js';
import { features } from '../config/features.js';

/**
 * LLM Client Factory
 * 
 * Provides a centralized way to create LLM client instances.
 * The factory pattern allows for easy switching between different
 * implementations without changing client code.
 */
export class LLMClientFactory {
    /**
     * Create an LLM client instance
     * 
     * Selects the appropriate client implementation based on Feature Flags:
     * - If FEATURE_LANGCHAIN_AGENT is enabled, returns LangChainBedrockAdapter
     * - Otherwise, returns BedrockClient (native implementation)
     * 
     * Both implementations conform to the ILLMClient interface, ensuring
     * they can be used interchangeably.
     * 
     * @param region - AWS region (default: us-east-1)
     * @returns ILLMClient instance (either BedrockClient or LangChainBedrockAdapter)
     * 
     * @example
     * ```typescript
     * // Create with default region
     * const client = LLMClientFactory.create();
     * 
     * // Create with custom region
     * const client = LLMClientFactory.create('us-west-2');
     * 
     * // Use the client (same interface regardless of implementation)
     * const response = await client.generateCompletion('Hello, world!');
     * ```
     */
    static create(region: string = 'us-east-1'): ILLMClient {
        // Check Feature Flag to determine which implementation to use
        if (features.useLangChainAgent) {
            // Use LangChain-based implementation
            return new LangChainBedrockAdapter(region);
        } else {
            // Use native AWS SDK implementation (default)
            return new BedrockClient(region);
        }
    }

    /**
     * Get the client type that will be created
     * 
     * Returns the name of the client class that will be instantiated
     * based on current Feature Flag configuration. Useful for logging,
     * debugging, and monitoring.
     * 
     * @returns Client type name ('BedrockClient' or 'LangChainBedrockAdapter')
     * 
     * @example
     * ```typescript
     * const clientType = LLMClientFactory.getClientType();
     * console.log(`Using ${clientType} for LLM operations`);
     * // Output: "Using BedrockClient for LLM operations"
     * // or: "Using LangChainBedrockAdapter for LLM operations"
     * ```
     */
    static getClientType(): string {
        if (features.useLangChainAgent) {
            return 'LangChainBedrockAdapter';
        } else {
            return 'BedrockClient';
        }
    }

    /**
     * Check if LangChain implementation is being used
     * 
     * @returns true if LangChain implementation is active, false otherwise
     * 
     * @example
     * ```typescript
     * if (LLMClientFactory.isUsingLangChain()) {
     *   console.log('LangChain features are enabled');
     * }
     * ```
     */
    static isUsingLangChain(): boolean {
        return features.useLangChainAgent;
    }

    /**
     * Create a client with explicit implementation choice
     * 
     * Bypasses Feature Flag configuration and creates a specific implementation.
     * Useful for testing, A/B testing, or explicit implementation selection.
     * 
     * @param useLangChain - true to use LangChain, false to use native client
     * @param region - AWS region (default: us-east-1)
     * @returns ILLMClient instance
     * 
     * @example
     * ```typescript
     * // Force LangChain implementation
     * const langChainClient = LLMClientFactory.createExplicit(true, 'us-east-1');
     * 
     * // Force native implementation
     * const nativeClient = LLMClientFactory.createExplicit(false, 'us-east-1');
     * ```
     */
    static createExplicit(useLangChain: boolean, region: string = 'us-east-1'): ILLMClient {
        if (useLangChain) {
            return new LangChainBedrockAdapter(region);
        } else {
            return new BedrockClient(region);
        }
    }
}
