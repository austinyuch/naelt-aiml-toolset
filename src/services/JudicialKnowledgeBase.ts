import { Chroma } from '@langchain/community/vectorstores/chroma';
import { BedrockEmbeddings } from '@langchain/aws';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * Configuration options for JudicialKnowledgeBase
 */
export interface JudicialKnowledgeBaseConfig {
    chromaUrl?: string;
    collectionName?: string;
    awsRegion?: string;
    embeddingModel?: string;
    llmModel?: string;
    chunkSize?: number;
    chunkOverlap?: number;
}

/**
 * Statistics about the knowledge base
 */
export interface KnowledgeBaseStats {
    totalDocuments: number;
    totalChunks: number;
    collectionName: string;
    isInitialized: boolean;
}

/**
 * Judicial Knowledge Base
 * 
 * 使用 RAG 建立判決書知識庫
 * 支援語義搜尋和問答
 * 
 * 用於 Module 3: 判決資料分析模組
 */
export class JudicialKnowledgeBase {
    private vectorStore?: Chroma;
    private qaChain?: RunnableSequence;
    private embeddings: BedrockEmbeddings;
    private llm: BedrockChat;
    private textSplitter: RecursiveCharacterTextSplitter;
    private config: Required<JudicialKnowledgeBaseConfig>;
    private initialized: boolean = false;
    private documentCount: number = 0;
    private chunkCount: number = 0;

    constructor(config: JudicialKnowledgeBaseConfig = {}) {
        // Set default configuration
        this.config = {
            chromaUrl: config.chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000',
            collectionName: config.collectionName || 'judicial-cases',
            awsRegion: config.awsRegion || process.env.AWS_REGION || 'us-east-1',
            embeddingModel: config.embeddingModel || 'amazon.titan-embed-text-v1',
            llmModel: config.llmModel || 'anthropic.claude-sonnet-4-5-20250929-v1:0',
            chunkSize: config.chunkSize || 1000,
            chunkOverlap: config.chunkOverlap || 200
        };

        // Initialize embeddings
        this.embeddings = new BedrockEmbeddings({
            region: this.config.awsRegion,
            model: this.config.embeddingModel,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });

        // Initialize LLM
        this.llm = new BedrockChat({
            model: this.config.llmModel,
            region: this.config.awsRegion,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });

        // Initialize text splitter
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.config.chunkSize,
            chunkOverlap: this.config.chunkOverlap
        });
    }

    /**
     * Initialize the knowledge base with documents
     * 
     * @param judgmentDocuments - Array of judgment documents to index
     */
    async initialize(judgmentDocuments: Document[]): Promise<void> {
        if (judgmentDocuments.length === 0) {
            throw new Error('Cannot initialize with empty documents');
        }

        try {
            // Split documents into chunks
            const splitDocs = await this.textSplitter.splitDocuments(judgmentDocuments);

            // Store counts
            this.documentCount = judgmentDocuments.length;
            this.chunkCount = splitDocs.length;

            // Create vector store
            this.vectorStore = await Chroma.fromDocuments(
                splitDocs,
                this.embeddings,
                {
                    collectionName: this.config.collectionName,
                    url: this.config.chromaUrl
                }
            );

            // Create QA chain using RunnableSequence
            const retriever = this.vectorStore.asRetriever({ k: 5 });
            const prompt = PromptTemplate.fromTemplate(
                `根據以下判決書內容回答問題。如果找不到相關資訊，請回答「找不到相關資訊」。

判決書內容：
{context}

問題：{question}

回答：`
            );

            this.qaChain = RunnableSequence.from([
                {
                    context: async (input: { question: string }) => {
                        const docs = await retriever.invoke(input.question);
                        return docs.map(doc => doc.pageContent).join('\n\n');
                    },
                    question: (input: { question: string }) => input.question
                },
                prompt,
                this.llm,
                new StringOutputParser()
            ]);

            this.initialized = true;
        } catch (error) {
            this.initialized = false;
            throw new Error(`Failed to initialize knowledge base: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Search for similar cases
     * 
     * @param query - Search query
     * @param k - Number of results to return (default: 5)
     * @returns Array of similar documents
     */
    async searchSimilarCases(query: string, k: number = 5): Promise<Document[]> {
        if (!this.initialized || !this.vectorStore) {
            throw new Error('Knowledge base not initialized');
        }

        try {
            const results = await this.vectorStore.similaritySearch(query, k);
            return results;
        } catch (error) {
            throw new Error(`Failed to search similar cases: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query the knowledge base with a question
     * 
     * @param question - Question to ask
     * @returns Answer based on the knowledge base
     */
    async query(question: string): Promise<string> {
        if (!this.initialized || !this.qaChain) {
            throw new Error('Knowledge base not initialized');
        }

        try {
            const response = await this.qaChain.invoke({ question });
            return response || '找不到相關資訊';
        } catch (error) {
            throw new Error(`Failed to query knowledge base: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get statistics about the knowledge base
     * 
     * @returns Statistics object
     */
    async getStats(): Promise<KnowledgeBaseStats> {
        return {
            totalDocuments: this.documentCount,
            totalChunks: this.chunkCount,
            collectionName: this.config.collectionName,
            isInitialized: this.initialized
        };
    }

    /**
     * Check if the knowledge base is initialized
     * 
     * @returns True if initialized, false otherwise
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        this.vectorStore = undefined;
        this.qaChain = undefined;
        this.initialized = false;
        this.documentCount = 0;
        this.chunkCount = 0;
    }
}
