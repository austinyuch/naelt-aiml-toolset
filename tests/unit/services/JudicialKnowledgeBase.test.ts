/**
 * JudicialKnowledgeBase Unit Tests
 * 
 * NOTE: These tests require Chroma vector database to be running.
 * To run these tests:
 * 1. Start Chroma: docker run -p 8000:8000 chromadb/chroma
 * 2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 * 3. Run: npm test tests/unit/services/JudicialKnowledgeBase.test.ts
 * 
 * These tests are skipped by default in CI/CD to avoid external dependencies.
 * Use describe.skip to enable/disable these tests.
 */

import { JudicialKnowledgeBase } from '../../../src/services/JudicialKnowledgeBase';
import { Document } from '@langchain/core/documents';

// Skip these tests by default - they require Chroma to be running
// Change to describe() to run these tests
describe.skip('JudicialKnowledgeBase', () => {
    let knowledgeBase: JudicialKnowledgeBase;

    beforeEach(() => {
        // Initialize with test configuration
        knowledgeBase = new JudicialKnowledgeBase({
            chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
            collectionName: `test-judicial-cases-${Date.now()}`, // Unique collection per test run
            awsRegion: process.env.AWS_REGION || 'us-east-1'
        });
    });

    afterEach(async () => {
        // Clean up resources
        if (knowledgeBase) {
            await knowledgeBase.cleanup();
        }
    });

    describe('Vector Database Initialization', () => {
        it('should initialize vector store with documents', async () => {
            // Arrange
            const testDocuments: Document[] = [
                new Document({
                    pageContent: '被告因殺人罪被判處無期徒刑，法院認定被告犯罪手段殘忍，且無悔意。',
                    metadata: {
                        caseId: 'case-001',
                        court: '最高法院',
                        year: 2023,
                        caseType: '刑事'
                    }
                }),
                new Document({
                    pageContent: '被告因過失致死罪被判處有期徒刑三年，法院考量被告已與被害人家屬達成和解。',
                    metadata: {
                        caseId: 'case-002',
                        court: '高等法院',
                        year: 2023,
                        caseType: '刑事'
                    }
                })
            ];

            // Act
            await knowledgeBase.initialize(testDocuments);

            // Assert
            expect(knowledgeBase.isInitialized()).toBe(true);
        }, 30000); // 30 second timeout for initialization

        it('should throw error when initializing with empty documents', async () => {
            // Arrange
            const emptyDocuments: Document[] = [];

            // Act & Assert
            await expect(knowledgeBase.initialize(emptyDocuments)).rejects.toThrow(
                'Cannot initialize with empty documents'
            );
        });

        it('should split long documents into chunks', async () => {
            // Arrange
            const longDocument = new Document({
                pageContent: '這是一個很長的判決書內容。'.repeat(500), // 創建長文本
                metadata: { caseId: 'case-003' }
            });

            // Act
            await knowledgeBase.initialize([longDocument]);

            // Assert
            const stats = await knowledgeBase.getStats();
            expect(stats.totalChunks).toBeGreaterThan(1);
        }, 30000);
    });

    describe('Similar Case Search', () => {
        beforeEach(async () => {
            // Setup test data
            const testDocuments: Document[] = [
                new Document({
                    pageContent: '被告因故意殺人罪被判處死刑，犯罪手段極其殘忍，社會影響惡劣。',
                    metadata: { caseId: 'case-001', severity: 'high' }
                }),
                new Document({
                    pageContent: '被告因過失致死罪被判處有期徒刑，已與被害人家屬和解。',
                    metadata: { caseId: 'case-002', severity: 'low' }
                }),
                new Document({
                    pageContent: '被告因傷害致死罪被判處有期徒刑十年，犯後態度良好。',
                    metadata: { caseId: 'case-003', severity: 'medium' }
                })
            ];

            await knowledgeBase.initialize(testDocuments);
        }, 30000);

        it('should search for similar cases', async () => {
            // Arrange
            const query = '殺人案件判決';

            // Act
            const results = await knowledgeBase.searchSimilarCases(query, 2);

            // Assert
            expect(results).toHaveLength(2);
            expect(results[0]).toHaveProperty('pageContent');
            expect(results[0]).toHaveProperty('metadata');
        }, 30000);

        it('should respect the k parameter for result count', async () => {
            // Arrange
            const query = '刑事案件';
            const k = 1;

            // Act
            const results = await knowledgeBase.searchSimilarCases(query, k);

            // Assert
            expect(results).toHaveLength(k);
        }, 30000);

        it('should throw error when searching before initialization', async () => {
            // Arrange
            const uninitializedKB = new JudicialKnowledgeBase();

            // Act & Assert
            await expect(
                uninitializedKB.searchSimilarCases('test query')
            ).rejects.toThrow('Knowledge base not initialized');
        });
    });

    describe('Question Answering', () => {
        beforeEach(async () => {
            // Setup test data with more detailed content
            const testDocuments: Document[] = [
                new Document({
                    pageContent: `
            案號：111年度重訴字第123號
            被告：張三
            罪名：故意殺人罪
            判決：死刑
            理由：被告犯罪手段極其殘忍，且無悔意，對社會危害極大。
            法院認為被告罪無可赦，應處以極刑。
          `,
                    metadata: { caseId: 'case-001', year: 2022 }
                }),
                new Document({
                    pageContent: `
            案號：111年度訴字第456號
            被告：李四
            罪名：過失致死罪
            判決：有期徒刑三年
            理由：被告已與被害人家屬達成和解，且犯後態度良好。
            法院考量被告並非故意犯罪，從輕量刑。
          `,
                    metadata: { caseId: 'case-002', year: 2022 }
                })
            ];

            await knowledgeBase.initialize(testDocuments);
        }, 30000);

        it('should answer questions based on case knowledge', async () => {
            // Arrange
            const question = '張三被判什麼刑罰？';

            // Act
            const answer = await knowledgeBase.query(question);

            // Assert
            expect(answer).toBeTruthy();
            expect(typeof answer).toBe('string');
            expect(answer.length).toBeGreaterThan(0);
        }, 60000); // 60 second timeout for LLM query
    });

    describe('Statistics and Management', () => {
        it('should provide statistics about the knowledge base', async () => {
            // Arrange
            const testDocuments: Document[] = [
                new Document({
                    pageContent: '測試判決書內容一',
                    metadata: { caseId: 'case-001' }
                }),
                new Document({
                    pageContent: '測試判決書內容二',
                    metadata: { caseId: 'case-002' }
                })
            ];

            await knowledgeBase.initialize(testDocuments);

            // Act
            const stats = await knowledgeBase.getStats();

            // Assert
            expect(stats).toHaveProperty('totalDocuments');
            expect(stats).toHaveProperty('totalChunks');
            expect(stats).toHaveProperty('collectionName');
            expect(stats.totalDocuments).toBeGreaterThan(0);
        }, 30000);

        it('should cleanup resources properly', async () => {
            // Arrange
            const testDocuments: Document[] = [
                new Document({
                    pageContent: '測試內容',
                    metadata: { caseId: 'case-001' }
                })
            ];

            await knowledgeBase.initialize(testDocuments);

            // Act
            await knowledgeBase.cleanup();

            // Assert
            expect(knowledgeBase.isInitialized()).toBe(false);
        }, 30000);
    });
});

// Simple unit tests that don't require external dependencies
describe('JudicialKnowledgeBase - Unit Tests', () => {
    it('should create instance with default configuration', () => {
        const kb = new JudicialKnowledgeBase();
        expect(kb).toBeDefined();
        expect(kb.isInitialized()).toBe(false);
    });

    it('should create instance with custom configuration', () => {
        const kb = new JudicialKnowledgeBase({
            chromaUrl: 'http://custom:8000',
            collectionName: 'custom-collection',
            awsRegion: 'us-west-2'
        });
        expect(kb).toBeDefined();
        expect(kb.isInitialized()).toBe(false);
    });

    it('should throw error when querying before initialization', async () => {
        const kb = new JudicialKnowledgeBase();
        await expect(kb.query('test')).rejects.toThrow('Knowledge base not initialized');
    });

    it('should throw error when searching before initialization', async () => {
        const kb = new JudicialKnowledgeBase();
        await expect(kb.searchSimilarCases('test')).rejects.toThrow('Knowledge base not initialized');
    });
});
