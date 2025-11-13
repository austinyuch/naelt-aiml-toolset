# Bedrock 模型配置總結

## 模型選擇決策

### 主要模型：Claude Sonnet 4.5 ✓

**模型 ID**: `anthropic.claude-sonnet-4-5-20250929-v1:0`

**選擇理由**：
1. **最新技術**：Claude 4.5 系列的最新模型
2. **最高品質**：提供最佳的內容生成品質
3. **繁體中文支援**：優秀的中文理解和生成能力
4. **適合生產環境**：穩定可靠，適合關鍵業務

**使用場景**：
- ✓ 生產環境的內容生成
- ✓ 複雜的論述生成
- ✓ 多變體內容創作
- ✓ 內容精煉和優化

**定價** (us-east-1)：
- 輸入：$3.00 / 1M tokens
- 輸出：$15.00 / 1M tokens

## 備用模型配置

### 1. 次要模型：Claude 3.5 Sonnet v2
**模型 ID**: `anthropic.claude-3-5-sonnet-20241022-v2:0`

**用途**：
- Sonnet 4.5 不可用時的備用方案
- 成本優化場景
- 品質與速度的平衡

### 2. 快速模型：Claude 3.5 Haiku
**模型 ID**: `anthropic.claude-3-5-haiku-20241022-v1:0`

**用途**：
- 快速回應需求
- 中等複雜度任務
- 成本效益的生產環境

**定價**：
- 輸入：$1.00 / 1M tokens
- 輸出：$5.00 / 1M tokens

### 3. 經濟模型：Claude 3 Haiku
**模型 ID**: `anthropic.claude-3-haiku-20240307-v1:0`

**用途**：
- 開發和測試
- 簡單查詢
- 成本敏感場景

**定價**：
- 輸入：$0.25 / 1M tokens
- 輸出：$1.25 / 1M tokens

## 模型選擇策略

### 預設策略：品質優先
```json
{
  "mode": "quality_priority",
  "primary": "claude-sonnet-4-5",
  "fallback_order": [
    "claude-sonnet-4-5",
    "claude-3-5-sonnet-v2",
    "claude-3-5-haiku",
    "claude-3-haiku"
  ]
}
```

### 成本優化策略（可選）
```json
{
  "mode": "cost_optimization",
  "primary": "claude-3-5-haiku",
  "fallback_order": [
    "claude-3-5-haiku",
    "claude-3-haiku",
    "claude-3-5-sonnet-v2",
    "claude-sonnet-4-5"
  ]
}
```

## 環境變數配置

### 生產環境
```bash
# 主要模型
export BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
export BEDROCK_MODEL_NAME="Claude Sonnet 4.5"

# 備用模型
export BEDROCK_SECONDARY_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
export BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# 區域配置
export BEDROCK_REGION=us-east-1

# 模型參數
export BEDROCK_MAX_TOKENS=4096
export BEDROCK_TEMPERATURE=0.7
export BEDROCK_TOP_P=0.9
```

### 開發環境
```bash
# 使用經濟模型進行開發測試
export BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
export BEDROCK_MODEL_NAME="Claude 3 Haiku"

# 備用模型
export BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0

# 區域配置
export BEDROCK_REGION=us-east-1

# 模型參數
export BEDROCK_MAX_TOKENS=2048
export BEDROCK_TEMPERATURE=0.7
```

## 成本估算

### 典型使用場景

#### 場景 1：單篇社群貼文生成
- 輸入：~500 tokens（提示詞 + 新聞背景）
- 輸出：~300 tokens（生成內容）
- 成本：~$0.0060 USD

#### 場景 2：多變體內容生成（3個變體）
- 輸入：~500 tokens × 3 = 1,500 tokens
- 輸出：~300 tokens × 3 = 900 tokens
- 成本：~$0.0180 USD

#### 場景 3：內容精煉
- 輸入：~800 tokens（原內容 + 精煉指示）
- 輸出：~400 tokens（精煉後內容）
- 成本：~$0.0084 USD

### 月度成本估算

假設每日生成：
- 10 篇多變體內容（30 個變體）
- 5 次內容精煉

**每日成本**：
- 內容生成：10 × $0.0180 = $0.18
- 內容精煉：5 × $0.0084 = $0.042
- **每日總計**：~$0.22 USD

**每月成本**：
- $0.22 × 30 = **~$6.60 USD**

### 成本優化建議

1. **開發測試使用 Haiku**
   - 節省 ~90% 成本
   - 開發階段月成本：~$0.66 USD

2. **批次處理**
   - 合併多個請求
   - 減少重複的上下文傳輸

3. **快取策略**
   - 快取常用的提示詞模板
   - 快取新聞搜尋結果（1小時）

4. **智能模型選擇**
   - 簡單任務使用 Haiku
   - 關鍵內容使用 Sonnet 4.5

## 驗證步驟

### 1. 驗證模型可用性
```bash
# 執行驗證腳本
./scripts/verify-bedrock-us-east-1.sh
```

### 2. 測試 Claude Sonnet 4.5
```bash
# 執行專用測試腳本
./scripts/test-claude-sonnet-4-5.sh
```

### 3. 手動測試
```bash
# 測試基本調用
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"你好"}]}' \
  --region us-east-1 \
  /tmp/test-output.json

# 查看結果
cat /tmp/test-output.json | jq
```

## 監控指標

### 需要追蹤的指標

1. **Token 使用量**
   - 每日輸入 tokens
   - 每日輸出 tokens
   - Token 使用趨勢

2. **成本追蹤**
   - 每日成本
   - 每月累計成本
   - 成本預警閾值

3. **效能指標**
   - 平均回應時間
   - 錯誤率
   - 模型選擇分布

4. **品質指標**
   - 內容品質評分
   - 使用者滿意度
   - 精煉次數

### CloudWatch 告警設定

```bash
# 每日成本告警（超過 $10）
aws cloudwatch put-metric-alarm \
  --alarm-name bedrock-daily-cost-alert \
  --alarm-description "Alert when daily Bedrock cost exceeds $10" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# 每月成本告警（超過 $200）
aws cloudwatch put-metric-alarm \
  --alarm-name bedrock-monthly-cost-alert \
  --alarm-description "Alert when monthly Bedrock cost exceeds $200" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 2592000 \
  --evaluation-periods 1 \
  --threshold 200 \
  --comparison-operator GreaterThanThreshold
```

## 最佳實踐

### 1. 模型選擇
- ✓ 生產環境使用 Sonnet 4.5
- ✓ 開發測試使用 Haiku
- ✓ 實作自動降級機制
- ✓ 監控模型效能和成本

### 2. 提示詞優化
- ✓ 使用清晰簡潔的提示詞
- ✓ 避免重複的上下文
- ✓ 快取常用的提示詞模板
- ✓ 定期審查和優化提示詞

### 3. 錯誤處理
- ✓ 實作重試機制（指數退避）
- ✓ 自動切換到備用模型
- ✓ 記錄所有錯誤和降級事件
- ✓ 設定告警通知

### 4. 成本控制
- ✓ 設定每日/每月成本上限
- ✓ 實作成本追蹤和報告
- ✓ 定期審查使用模式
- ✓ 優化 token 使用效率

## 配置檔案

### 模型配置：config/bedrock-models.json
包含完整的模型配置、定價資訊和使用指南。

### 環境配置：.env
```bash
# Bedrock 模型配置
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_SECONDARY_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# 模型參數
BEDROCK_MAX_TOKENS=4096
BEDROCK_TEMPERATURE=0.7
BEDROCK_TOP_P=0.9

# 成本控制
BEDROCK_DAILY_COST_LIMIT=10.0
BEDROCK_MONTHLY_COST_LIMIT=200.0
```

## 下一步行動

### 立即執行
1. ✓ 模型配置已更新為 Claude Sonnet 4.5
2. ✓ 文件已更新
3. ✓ 驗證腳本已創建

### 待執行
1. [ ] 在 AWS Console 請求 Claude Sonnet 4.5 模型訪問權限
2. [ ] 執行 `./scripts/test-claude-sonnet-4-5.sh` 驗證模型訪問
3. [ ] 更新應用程式代碼以使用新的模型配置
4. [ ] 設定 CloudWatch 成本告警
5. [ ] 實作模型選擇和降級邏輯

## 參考資料

- [AWS Bedrock 定價](https://aws.amazon.com/bedrock/pricing/)
- [Claude 模型文件](https://docs.anthropic.com/claude/docs)
- [Bedrock API 參考](https://docs.aws.amazon.com/bedrock/latest/APIReference/)
- [模型配置檔案](../config/bedrock-models.json)

---

**配置版本**: 1.0.0  
**最後更新**: 2025-11-13  
**狀態**: ✓ 已配置，待驗證模型訪問權限
