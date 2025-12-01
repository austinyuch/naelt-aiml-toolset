#!/usr/bin/env tsx

/**
 * Chroma Connection Test Script
 * 
 * 用途：測試 Chroma 向量資料庫連接並驗證基本功能
 * 使用方式：npx tsx scripts/test-chroma-connection.ts
 */

import { ChromaClient } from 'chromadb';

// 顏色輸出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testChromaConnection() {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    const authToken = process.env.CHROMA_AUTH_TOKEN;

    log('\n=== Chroma 連接測試 ===\n', 'blue');
    log(`連接 URL: ${chromaUrl}`, 'blue');

    try {
        // 創建 Chroma 客戶端
        const client = new ChromaClient({
            path: chromaUrl,
            auth: authToken ? { provider: 'token', credentials: authToken } : undefined
        });

        // 測試 1: 心跳檢查
        log('\n[測試 1] 心跳檢查...', 'yellow');
        const heartbeat = await client.heartbeat();
        log(`✓ 心跳響應: ${heartbeat}`, 'green');

        // 測試 2: 獲取版本
        log('\n[測試 2] 獲取版本信息...', 'yellow');
        const version = await client.version();
        log(`✓ Chroma 版本: ${version}`, 'green');

        // 測試 3: 列出集合
        log('\n[測試 3] 列出現有集合...', 'yellow');
        const collections = await client.listCollections();
        log(`✓ 找到 ${collections.length} 個集合`, 'green');
        if (collections.length > 0) {
            collections.forEach(col => {
                log(`  - ${col.name} (${col.metadata?.description || '無描述'})`, 'blue');
            });
        }

        // 測試 4: 創建測試集合
        log('\n[測試 4] 創建測試集合...', 'yellow');
        const testCollectionName = `test-collection-${Date.now()}`;

        try {
            const collection = await client.createCollection({
                name: testCollectionName,
                metadata: {
                    description: '測試集合',
                    created_at: new Date().toISOString()
                }
            });
            log(`✓ 集合已創建: ${collection.name}`, 'green');

            // 測試 5: 添加文檔
            log('\n[測試 5] 添加測試文檔...', 'yellow');
            await collection.add({
                ids: ['test-1', 'test-2', 'test-3'],
                documents: [
                    '這是第一個測試文檔，關於司法改革。',
                    '這是第二個測試文檔，關於受害者權益。',
                    '這是第三個測試文檔，關於法院判決。'
                ],
                metadatas: [
                    { type: 'test', topic: '司法改革' },
                    { type: 'test', topic: '受害者權益' },
                    { type: 'test', topic: '法院判決' }
                ]
            });
            log('✓ 已添加 3 個測試文檔', 'green');

            // 測試 6: 查詢文檔
            log('\n[測試 6] 查詢相似文檔...', 'yellow');
            const results = await collection.query({
                queryTexts: ['司法'],
                nResults: 2
            });
            log(`✓ 找到 ${results.ids[0].length} 個相似文檔`, 'green');
            results.documents[0].forEach((doc, idx) => {
                log(`  ${idx + 1}. ${doc?.substring(0, 50)}...`, 'blue');
            });

            // 測試 7: 獲取集合統計
            log('\n[測試 7] 獲取集合統計...', 'yellow');
            const count = await collection.count();
            log(`✓ 集合中有 ${count} 個文檔`, 'green');

            // 測試 8: 刪除測試集合
            log('\n[測試 8] 清理測試集合...', 'yellow');
            await client.deleteCollection({ name: testCollectionName });
            log('✓ 測試集合已刪除', 'green');

        } catch (error) {
            log(`✗ 集合操作失敗: ${error}`, 'red');
            // 嘗試清理
            try {
                await client.deleteCollection({ name: testCollectionName });
            } catch (cleanupError) {
                // 忽略清理錯誤
            }
        }

        // 總結
        log('\n=== 測試完成 ===\n', 'green');
        log('✓ 所有測試通過！Chroma 連接正常。', 'green');
        log(`\n連接信息：`, 'blue');
        log(`  URL: ${chromaUrl}`, 'blue');
        log(`  認證: ${authToken ? '已啟用' : '未啟用'}`, 'blue');
        log(`  版本: ${version}`, 'blue');

        return true;

    } catch (error) {
        log('\n=== 測試失敗 ===\n', 'red');
        log(`✗ 錯誤: ${error}`, 'red');

        if (error instanceof Error) {
            log(`\n錯誤詳情:`, 'red');
            log(`  訊息: ${error.message}`, 'red');
            if (error.stack) {
                log(`  堆疊: ${error.stack.split('\n').slice(0, 3).join('\n')}`, 'red');
            }
        }

        log('\n故障排除建議:', 'yellow');
        log('  1. 確認 Chroma 服務正在運行：docker-compose -f docker-compose.chroma.yml ps', 'yellow');
        log('  2. 檢查 Chroma 日誌：docker-compose -f docker-compose.chroma.yml logs chroma', 'yellow');
        log('  3. 驗證環境變數：echo $CHROMA_URL', 'yellow');
        log('  4. 測試連接：curl http://localhost:8000/api/v1/heartbeat', 'yellow');

        return false;
    }
}

// 執行測試
testChromaConnection()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        log(`\n未預期的錯誤: ${error}`, 'red');
        process.exit(1);
    });
