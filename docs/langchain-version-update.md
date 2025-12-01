# LangChain 版本更新說明

## 最新版本資訊 (2024-12-01)

根據 npm registry 查詢結果，LangChain 已正式發布 v1.x 穩定版本：

| 套件 | 最新版本 | 發布時間 | 狀態 |
|------|---------|---------|------|
| `langchain` | **1.1.1** | 5 天前 | ✅ 穩定 |
| `@langchain/core` | **1.1.0** | 6 天前 | ✅ 穩定 |
| `@langchain/community` | **1.0.5** | 3 天前 | ✅ 穩定 |
| `@langchain/aws` | **1.0.3** | 3 天前 | ✅ 穩定 |

## 版本變更重點

### v0.3.x → v1.x 主要變更

1. **API 穩定性提升**
   - v1.x 標誌著 API 進入穩定期
   - 承諾向後相容性（Semantic Versioning）
   - 減少破壞性變更

2. **效能優化**
   - 改善記憶體使用
   - 優化 LLM 調用效率
   - 更好的串流支援

3. **新功能**
   - 增強的 Agent 架構
   - 更多整合選項
   - 改進的錯誤處理

## 建議的 package.json 配置

### 開發環境（允許小版本更新）

```json
{
  "dependencies": {
    "langchain": "^1.1.1",
    "@langchain/core": "^1.1.0",
    "@langchain/community": "^1.0.5",
    "@langchain/aws": "^1.0.3",
    "chromadb": "^1.8.0"
  }
}
```

### 生產環境（鎖定版本）

```json
{
  "dependencies": {
    "langchain": "1.1.1",
    "@langchain/core": "1.1.0",
    "@langchain/community": "1.0.5",
    "@langchain/aws": "1.0.3",
    "chromadb": "1.8.0"
  }
}
```

## 安裝指令

```bash
# 方法 1: 直接指定版本
npm install langchain@1.1.1 @langchain/core@1.1.0 @langchain/community@1.0.5 @langchain/aws@1.0.3

# 方法 2: 安裝最新版本
npm install langchain @langchain/core @langchain/community @langchain/aws

# 方法 3: 使用 package.json 後安裝
npm install
```

## 遷移注意事項

### 從 v0.3.x 升級到 v1.x

1. **檢查破壞性變更**
   - 閱讀官方遷移指南：https://docs.langchain.com/oss/javascript/langchain/overview
   - 查看 CHANGELOG 了解詳細變更

2. **更新程式碼**
   ```typescript
   // v0.3.x (舊)
   import { OpenAI } from "langchain/llms/openai";
   
   // v1.x (新)
   import { OpenAI } from "@langchain/openai";
   ```

3. **測試覆蓋**
   - 執行完整測試套件
   - 特別注意 Agent 和 Chain 相關功能
   - 驗證 AWS Bedrock 整合

4. **漸進式升級**
   - 先在開發環境測試
   - 使用 Feature Flag 控制
   - 監控生產環境表現

## 相容性檢查

### Node.js 版本需求

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

本專案使用 Node.js 24+，完全相容。

### TypeScript 版本需求

```json
{
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

本專案使用 TypeScript 5.3.3，完全相容。

## 額外依賴

### 向量資料庫選項

```bash
# Chroma (推薦用於本地開發)
npm install chromadb@1.8.0

# FAISS (高效能，需要編譯)
npm install faiss-node

# Pinecone (雲端服務)
npm install @pinecone-database/pinecone
```

### AWS SDK 依賴

```bash
# @langchain/aws 需要的 peer dependencies
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-s3
```

## 驗證安裝

```bash
# 檢查已安裝版本
npm list langchain @langchain/core @langchain/community @langchain/aws

# 執行測試
npm test

# 型別檢查
npm run type-check
```

## 更新策略建議

### 短期（1-2 週）
- ✅ 更新到 v1.1.x 最新版本
- ✅ 執行完整測試套件
- ✅ 更新文件和範例程式碼

### 中期（1-2 月）
- ⚠️ 監控新版本發布
- ⚠️ 評估新功能價值
- ⚠️ 定期安全更新

### 長期（持續）
- 🔄 追蹤 LangChain 路線圖
- 🔄 參與社群討論
- 🔄 貢獻改進建議

## 參考資源

- [LangChain 官方文檔](https://js.langchain.com/)
- [遷移指南](https://docs.langchain.com/oss/javascript/langchain/overview)
- [GitHub Releases](https://github.com/langchain-ai/langchainjs/releases)
- [npm Registry](https://www.npmjs.com/package/langchain)
