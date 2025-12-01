import { Document } from '@langchain/core/documents';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Judgment document interface
 */
export interface JudgmentDocument {
    caseId: string;
    court: string;
    year: number;
    caseType: string;
    defendant: string;
    charge: string;
    verdict: string;
    content: string;
}

/**
 * Judicial Document Loader
 * 
 * Loads judgment documents from various sources and converts them to LangChain Document format
 */
export class JudicialDocumentLoader {
    /**
     * Load judgment documents from a JSON file
     * 
     * @param filePath - Path to the JSON file containing judgment documents
     * @returns Array of LangChain Documents
     */
    async loadFromJSON(filePath: string): Promise<Document[]> {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const judgments: JudgmentDocument[] = JSON.parse(fileContent);

            return judgments.map(judgment => new Document({
                pageContent: judgment.content,
                metadata: {
                    caseId: judgment.caseId,
                    court: judgment.court,
                    year: judgment.year,
                    caseType: judgment.caseType,
                    defendant: judgment.defendant,
                    charge: judgment.charge,
                    verdict: judgment.verdict,
                    source: 'json',
                    loadedAt: new Date().toISOString()
                }
            }));
        } catch (error) {
            throw new Error(`Failed to load documents from JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Load judgment documents from a directory of text files
     * 
     * @param dirPath - Path to the directory containing text files
     * @returns Array of LangChain Documents
     */
    async loadFromDirectory(dirPath: string): Promise<Document[]> {
        try {
            const files = await fs.readdir(dirPath);
            const txtFiles = files.filter(file => file.endsWith('.txt'));

            const documents: Document[] = [];

            for (const file of txtFiles) {
                const filePath = path.join(dirPath, file);
                const content = await fs.readFile(filePath, 'utf-8');

                // Extract case ID from filename (e.g., "111-重訴-123.txt" -> "111-重訴-123")
                const caseId = path.basename(file, '.txt');

                documents.push(new Document({
                    pageContent: content,
                    metadata: {
                        caseId,
                        source: 'file',
                        fileName: file,
                        loadedAt: new Date().toISOString()
                    }
                }));
            }

            return documents;
        } catch (error) {
            throw new Error(`Failed to load documents from directory: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Load a single judgment document from a text file
     * 
     * @param filePath - Path to the text file
     * @returns LangChain Document
     */
    async loadFromFile(filePath: string): Promise<Document> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const fileName = path.basename(filePath);
            const caseId = path.basename(filePath, path.extname(filePath));

            return new Document({
                pageContent: content,
                metadata: {
                    caseId,
                    source: 'file',
                    fileName,
                    loadedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            throw new Error(`Failed to load document from file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Create sample documents for testing
     * 
     * @returns Array of sample LangChain Documents
     */
    createSampleDocuments(): Document[] {
        return [
            new Document({
                pageContent: `
                    臺灣高等法院刑事判決
                    111年度重訴字第123號
                    
                    被告：張三
                    罪名：故意殺人罪
                    判決：死刑
                    
                    理由：被告犯罪手段極其殘忍，且無悔意，對社會危害極大。
                    法院認為被告罪無可赦，應處以極刑。
                `,
                metadata: {
                    caseId: '111-重訴-123',
                    court: '臺灣高等法院',
                    year: 2022,
                    caseType: '刑事',
                    defendant: '張三',
                    charge: '故意殺人罪',
                    verdict: '死刑',
                    source: 'sample'
                }
            }),
            new Document({
                pageContent: `
                    臺灣臺北地方法院刑事判決
                    111年度訴字第456號
                    
                    被告：李四
                    罪名：過失致死罪
                    判決：有期徒刑三年
                    
                    理由：被告已與被害人家屬達成和解，且犯後態度良好。
                    法院考量被告並非故意犯罪，從輕量刑。
                `,
                metadata: {
                    caseId: '111-訴-456',
                    court: '臺灣臺北地方法院',
                    year: 2022,
                    caseType: '刑事',
                    defendant: '李四',
                    charge: '過失致死罪',
                    verdict: '有期徒刑三年',
                    source: 'sample'
                }
            }),
            new Document({
                pageContent: `
                    臺灣高等法院刑事判決
                    111年度訴字第789號
                    
                    被告：陳九
                    罪名：傷害致死罪
                    判決：有期徒刑十年
                    
                    理由：被告犯後態度良好，已與被害人家屬達成部分和解。
                    法院考量被告並非預謀殺人，但傷害行為導致被害人死亡。
                `,
                metadata: {
                    caseId: '111-訴-789',
                    court: '臺灣高等法院',
                    year: 2022,
                    caseType: '刑事',
                    defendant: '陳九',
                    charge: '傷害致死罪',
                    verdict: '有期徒刑十年',
                    source: 'sample'
                }
            })
        ];
    }
}
