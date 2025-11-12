# 測試指南

本目錄包含司法正義論述生成器的所有測試。

## 測試結構

```
tests/
├── unit/                    # 單元測試（Mock-based）
│   ├── api/                # API 層測試
│   ├── clients/            # 外部客戶端測試
│   ├── core/               # 核心工具測試
│   ├── mcp/                # MCP 伺服器測試
│   ├── prompts/            # 提示模板測試
│   └── services/           # 服務層測試
├── integration/            # 整合測試（Docker-based）
│   ├── api.integration.test.ts    # API 整合測試
│   └── mcp.integration.test.ts    # MCP 整合測試
├── performance/            # 效能測試
│   └── baseline.test.ts   # 效能基準測試
└── fixtures/               # 測試固件
```

## 測試類型

### 1. 單元測試（Unit Tests）

**目的**: 快速反饋、100% 可靠、CI/CD 友善

**特點**:

- 使用 Mock 模擬外部依賴
- 執行速度快（< 5 分鐘）
- 不需要外部服務
- 測試覆蓋率目標：95%+

**執行**:

```bash
npm run test:unit
```

### 2. 整合測試（Integration Tests）

**目的**: 真實環境驗證、部署前檢查

**特點**:

- 使用真實的外部服務（或 Docker 環境）
- 測試完整的 API 流程
- 驗證 MCP 工具功能
- 執行時間較長（< 15 分鐘）

**前置需求**:

- AWS 憑證（用於 Bedrock）
- News API Key（可選）
- Docker（可選，用於隔離環境）

**執行**:

```bash
# 設定環境變數
export AWS_REGION=us-east-1
export NEWS_API_KEY=your-api-key

# 執行整合測試
npm run test:integration
```

### 3. 效能測試（Performance Tests）

**目的**: 建立效能基準、檢測效能退化

**特點**:

- 測量回應時間
- 驗證 SLA 目標
- 檢測記憶體洩漏
- 測試並發處理能力

**效能目標**:

- Health Check: < 50ms (p95)
- Template Listing: < 500ms (p95)
- News Search: < 10s (p95)
- Content Generation: < 30s (p95)
- Content Refinement: < 20s (p95)

**執行**:

```bash
npm run test:performance
```

## 執行所有測試

```bash
# 執行所有測試（單元 + 整合 + 效能）
npm run test:all

# 執行所有測試並生成覆蓋率報告
npm run test:coverage
```

## TDD 工作流程

本專案遵循測試驅動開發（TDD）方法論：

### Red-Green-Refactor 循環

1. **RED 階段**: 先寫失敗的測試

   ```typescript
   it('should generate 3 content variants', async () => {
     const result = await generateContent(...);
     expect(result.variants).toHaveLength(3);
   });
   ```

2. **GREEN 階段**: 實作最小程式碼使測試通過

   ```typescript
   async function generateContent(...): Promise<ContentGenerationResponse> {
     return {
       variants: [{...}, {...}, {...}],
       generation_id: '...'
     };
   }
   ```

3. **REFACTOR 階段**: 重構並保持測試通過
   ```typescript
   async function generateContent(...): Promise<ContentGenerationResponse> {
     const variants = STRATEGIES.map(strategy =>
       this.generateVariant(strategy)
     );
     return { variants, generation_id: generateId() };
   }
   ```

## 測試最佳實踐

### 1. 測試命名

使用描述性的測試名稱：

```typescript
// ✅ 好的命名
it("should return cached results when cache is valid", async () => {});

// ❌ 不好的命名
it("test cache", async () => {});
```

### 2. 測試獨立性

每個測試應該獨立且可重複：

```typescript
// ✅ 好的做法
beforeEach(() => {
  // 每個測試前重置狀態
  cache.clear();
});

// ❌ 不好的做法
let sharedState = {};
it("test 1", () => {
  sharedState.value = 1;
});
it("test 2", () => {
  expect(sharedState.value).toBe(1);
}); // 依賴 test 1
```

### 3. 使用 Mock

適當使用 Mock 隔離外部依賴：

```typescript
// Mock 外部 API
jest.mock("../clients/BedrockClient");
const mockBedrockClient = BedrockClient as jest.MockedClass<
  typeof BedrockClient
>;
mockBedrockClient.prototype.generateCompletion.mockResolvedValue(
  "Generated text"
);
```

### 4. 測試覆蓋率

- 核心業務邏輯：95%+
- API 端點：90%+
- 工具函數：85%+
- 整體專案：80%+

### 5. 超時設定

為長時間執行的測試設定適當的超時：

```typescript
it("should generate content", async () => {
  // 測試邏輯
}, 60000); // 60 秒超時
```

## 除錯測試

### 執行單一測試

```bash
# 執行特定測試檔案
npm test -- tests/unit/services/ContentGenerationService.test.ts

# 執行特定測試案例
npm test -- -t "should generate 3 content variants"
```

### 監視模式

```bash
# 監視模式（自動重新執行測試）
npm run test:watch
```

### 詳細輸出

```bash
# 顯示詳細測試輸出
npm test -- --verbose
```

### 除錯模式

```bash
# 使用 Node.js 除錯器
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD 整合

### GitHub Actions

專案已配置 GitHub Actions 工作流程（`.github/workflows/deploy.yml`），會自動執行：

1. 單元測試
2. 型別檢查
3. Linting
4. 建構驗證

### 本地 CI 模擬

```bash
# 模擬 CI 環境執行測試
npm run lint && npm run type-check && npm run test:unit
```

## 常見問題

### Q: 整合測試失敗，顯示 AWS 憑證錯誤

**A**: 確認 AWS CLI 已配置：

```bash
aws configure list
```

或設定環境變數：

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

### Q: MCP 整合測試超時

**A**: 確認 MCP 伺服器已建構：

```bash
npm run build
```

並檢查 `dist/index.js` 檔案存在。

### Q: 效能測試失敗

**A**: 效能測試可能受到系統負載影響。在低負載環境下重新執行：

```bash
npm run test:performance
```

### Q: 測試覆蓋率不足

**A**: 查看覆蓋率報告：

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

找出未覆蓋的程式碼並補充測試。

## 貢獻指南

### 新增測試

1. 在適當的目錄建立測試檔案（`*.test.ts`）
2. 遵循現有的測試結構和命名慣例
3. 確保測試通過：`npm test`
4. 檢查測試覆蓋率：`npm run test:coverage`

### 測試審查清單

- [ ] 測試名稱清晰描述測試內容
- [ ] 測試獨立且可重複
- [ ] 適當使用 Mock 隔離外部依賴
- [ ] 包含正常和異常情況測試
- [ ] 設定適當的超時時間
- [ ] 測試通過且覆蓋率達標

## 相關資源

- [Jest 文件](https://jestjs.io/)
- [Supertest 文件](https://github.com/visionmedia/supertest)
- [MCP SDK 文件](https://github.com/modelcontextprotocol/sdk)
- [專案 README](../README.md)
- [API 使用指南](../docs/api-guide.md)
- [MCP 整合指南](../docs/mcp-guide.md)

## 支援

如有測試相關問題，請透過 GitHub Issues 聯繫。
