/**
 * Example: Using Judicial Knowledge Base with RAG
 * 
 * This example demonstrates how to use the JudicialKnowledgeBase service
 * to create a searchable knowledge base of judicial cases.
 * 
 * Prerequisites:
 * 1. Chroma vector database running (see scripts/setup-rag-environment.sh)
 * 2. AWS credentials configured
 * 3. Environment variables set (see .env.example)
 */

import { JudicialKnowledgeBase } from '../src/services/JudicialKnowledgeBase.js';
import { JudicialDocumentLoader } from '../src/services/JudicialDocumentLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🏛️  Judicial Knowledge Base Example');
    console.log('=====================================\n');

    // Step 1: Initialize the knowledge base
    console.log('📚 Step 1: Initializing Knowledge Base...');
    const knowledgeBase = new JudicialKnowledgeBase({
        chromaUrl: process.env.CHROMA_URL || 'http://localhost:8001',
        collectionName: 'judicial-cases-example',
        awsRegion: process.env.AWS_REGION || 'us-east-1'
    });

    // Step 2: Load judgment documents
    console.log('📄 Step 2: Loading Judgment Documents...');
    const loader = new JudicialDocumentLoader();

    // Option 1: Load from JSON file
    const jsonPath = path.join(__dirname, '../tests/fixtures/sample-judgment.json');
    const documents = await loader.loadFromJSON(jsonPath);
    console.log(`   Loaded ${documents.length} documents from JSON\n`);

    // Option 2: Use sample documents (uncomment to use)
    // const documents = loader.createSampleDocuments();
    // console.log(`   Created ${documents.length} sample documents\n`);

    // Step 3: Initialize the knowledge base with documents
    console.log('🔧 Step 3: Initializing Vector Store...');
    await knowledgeBase.initialize(documents);
    console.log('   ✅ Knowledge base initialized\n');

    // Step 4: Get statistics
    console.log('📊 Step 4: Knowledge Base Statistics');
    const stats = await knowledgeBase.getStats();
    console.log(`   Total Documents: ${stats.totalDocuments}`);
    console.log(`   Total Chunks: ${stats.totalChunks}`);
    console.log(`   Collection: ${stats.collectionName}`);
    console.log(`   Initialized: ${stats.isInitialized}\n`);

    // Step 5: Search for similar cases
    console.log('🔍 Step 5: Searching for Similar Cases...');
    const searchQuery = '殺人案件判決';
    console.log(`   Query: "${searchQuery}"`);

    const similarCases = await knowledgeBase.searchSimilarCases(searchQuery, 3);
    console.log(`   Found ${similarCases.length} similar cases:\n`);

    similarCases.forEach((doc, index) => {
        console.log(`   ${index + 1}. Case ID: ${doc.metadata.caseId}`);
        console.log(`      Court: ${doc.metadata.court}`);
        console.log(`      Charge: ${doc.metadata.charge}`);
        console.log(`      Verdict: ${doc.metadata.verdict}`);
        console.log(`      Preview: ${doc.pageContent.substring(0, 100)}...`);
        console.log('');
    });

    // Step 6: Ask questions
    console.log('💬 Step 6: Question Answering...');

    const questions = [
        '哪些案件被判處死刑？',
        '過失致死罪通常判多久？',
        '哪些被告已經與被害人家屬和解？'
    ];

    for (const question of questions) {
        console.log(`   Q: ${question}`);
        try {
            const answer = await knowledgeBase.query(question);
            console.log(`   A: ${answer}\n`);
        } catch (error) {
            console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
        }
    }

    // Step 7: Cleanup
    console.log('🧹 Step 7: Cleaning up...');
    await knowledgeBase.cleanup();
    console.log('   ✅ Cleanup complete\n');

    console.log('=====================================');
    console.log('✅ Example completed successfully!');
}

// Run the example
main().catch((error) => {
    console.error('❌ Error running example:', error);
    process.exit(1);
});
