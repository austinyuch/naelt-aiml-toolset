# Chroma 快速參考卡片

## 🚀 快速開始

```bash
# 一鍵設置開發環境
./scripts/setup-chroma.sh setup dev

# 驗證連接
npx tsx scripts/test-chroma-connection.ts

# 運行測試
./scripts/run-rag-tests.sh dev
```

## 📋 常用命令

### 環境設置

| 命令 | 說明 |
|------|------|
| `./scripts/setup-chroma.sh setup dev` | 設置開發環境（含管理界面） |
| `./scripts/setup-chroma.sh setup test` | 設置測試環境（含認證） |
| `./scripts/setup-chroma.sh setup prod` | 設置生產環境（強認證） |

### 服務管理

| 命令 | 說明 |
|------|------|
| `./scripts/chroma-manager.sh start dev` | 啟動開發環境 |
| `./scripts/chroma-manager.sh start-dev` | 啟動（含管理界面） |
| `./scripts/chroma-manager.sh stop` | 停止服務 |
| `./scripts/chroma-manager.sh restart dev` | 重啟服務 |
| `./scripts/chroma-manager.sh status` | 查看狀態 |
| `./scripts/chroma-manager.sh logs` | 查看日誌 |

### 測試和驗證

| 命令 | 說明 |
|------|------|
| `npx tsx scripts/test-chroma-connection.ts` | 測試連接 |
| `./scripts/run-rag-tests.sh` | 運行 RAG 測試 |
| `npm run test:rag` | 運行所有 RAG 測試 |
| `npm run test:vitest` | 運行單元測試 |

### 數據管理

| 命令 | 說明 |
|------|------|
| `./scripts/chroma-manager.sh backup` | 備份數據 |
| `./scripts/chroma-manager.sh cleanup` | 清理數據（危險！） |

### 生產部署

| 命令 | 說明 |
|------|------|
| `./scripts/deploy-production.sh deploy` | 部署生產環境 |
| `./scripts/deploy-production.sh status` | 查看部署狀態 |
| `./scripts/deploy-production.sh stop` | 停止生產服務 |

## 🔧 配置文件

### 環境變數 (.env)

```bash
# 啟用 RAG 功能
FEATURE_LANGCHAIN_RAG=true

# Chroma 配置
CHROMA_URL=http://localhost:8000
CHROMA_USERNAME=admin
CHROMA_PASSWORD=your_password
```

### Docker Compose

```bash
# 開發環境（含管理界面）
docker-compose -f docker-compose.chroma.yml --profile dev up -d

# 生產環境
docker-compose -f docker-compose.chroma.prod.yml up -d

# 停止
docker-compose -f docker-compose.chroma.yml down
```

## 🌐 訪問端點

### 開發環境

- **Chroma API**: http://localhost:8000
- **管理界面**: http://localhost:3001
- **健康檢查**: http://localhost:8000/api/v1/heartbeat

### 測試環境

- **Chroma API**: http://localhost:8001
- **健康檢查**: http://localhost:8001/api/v1/heartbeat

### 生產環境

- **Chroma API**: https://your-domain.com
- **健康檢查**: https://your-domain.com/health

## 🔍 健康檢查

```bash
# 快速檢查
curl http://localhost:8000/api/v1/heartbeat

# 獲取版本
curl http://localhost:8000/api/v1/version

# 列出集合
curl http://localhost:8000/api/v1/collections

# 使用測試腳本
npx tsx scripts/test-chroma-connection.ts
```

## 🐛 故障排除

### 連接失敗

```bash
# 檢查服務狀態
./scripts/chroma-manager.sh status

# 查看日誌
./scripts/chroma-manager.sh logs

# 重啟服務
./scripts/chroma-manager.sh restart dev
```

### 認證失敗

```bash
# 重新生成認證
./scripts/setup-chroma-auth.sh

# 檢查認證文件
cat config/server.htpasswd
```

### 端口衝突

```bash
# 修改端口（在 .env.chroma.dev 中）
CHROMA_PORT=8002

# 或使用環境變數
CHROMA_PORT=8002 ./scripts/chroma-manager.sh start dev
```

### 數據問題

```bash
# 重置數據（警告：會刪除所有數據）
./scripts/chroma-manager.sh cleanup

# 重新設置
./scripts/chroma-manager.sh setup dev
```

## 📊 監控命令

```bash
# 查看容器狀態
docker ps | grep chroma

# 查看資源使用
docker stats advocacy-chroma

# 查看日誌（實時）
docker-compose -f docker-compose.chroma.yml logs -f chroma

# 查看最後 100 行日誌
docker-compose -f docker-compose.chroma.yml logs --tail=100 chroma
```

## 💾 備份和恢復

### 備份

```bash
# 自動備份
./scripts/chroma-manager.sh backup

# 備份位置
ls -lh backups/chroma/
```

### 恢復

```bash
# 停止服務
./scripts/chroma-manager.sh stop

# 恢復數據
docker run --rm \
  -v advocacy-content-generator_chroma_data:/target \
  -v $(pwd)/backups:/backup \
  alpine:latest \
  tar xzf /backup/your_backup.tar.gz -C /target

# 啟動服務
./scripts/chroma-manager.sh start dev
```

## 🧪 測試工作流

### 單元測試（無需外部依賴）

```bash
npm run test:vitest -- -t "Unit Tests"
```

### 整合測試（需要 Chroma）

```bash
# 啟動 Chroma
./scripts/chroma-manager.sh start dev

# 運行測試
npm test -- tests/integration/langchain-rag.integration.test.ts

# 停止 Chroma
./scripts/chroma-manager.sh stop
```

### 完整測試流程

```bash
./scripts/run-rag-tests.sh test
```

## 📚 文檔鏈接

- **完整設置指南**: `docs/rag-setup-guide.md`
- **部署指南**: `docs/chroma-deployment-guide.md`
- **測試指南**: `tests/unit/services/README-RAG-TESTS.md`
- **使用範例**: `examples/rag-judicial-knowledge-base.ts`

## 🆘 獲取幫助

```bash
# 查看腳本幫助
./scripts/setup-chroma.sh help
./scripts/chroma-manager.sh help

# 運行診斷
./scripts/chroma-manager.sh status
npx tsx scripts/test-chroma-connection.ts
```

## 🔐 安全提示

1. **開發環境**: 無認證，僅用於本地開發
2. **測試環境**: 啟用認證，用於自動化測試
3. **生產環境**: 強認證 + SSL，用於生產部署

⚠️ **重要**: 生產環境的認證密碼會在設置時顯示，請妥善保管！

## 📝 環境變數速查

```bash
# 必需
CHROMA_URL=http://localhost:8000

# 可選（生產環境推薦）
CHROMA_USERNAME=admin
CHROMA_PASSWORD=your_password
CHROMA_TELEMETRY=FALSE

# 功能開關
FEATURE_LANGCHAIN_RAG=true
```

## 🎯 常見任務

### 開發新功能

```bash
# 1. 啟動開發環境
./scripts/chroma-manager.sh start-dev

# 2. 運行測試（監視模式）
npm run test:vitest:ui

# 3. 查看管理界面
open http://localhost:3001
```

### 運行測試

```bash
# 1. 設置測試環境
./scripts/setup-chroma.sh setup test

# 2. 運行測試
./scripts/run-rag-tests.sh test

# 3. 清理
./scripts/chroma-manager.sh stop
```

### 部署到生產

```bash
# 1. 部署
./scripts/deploy-production.sh deploy

# 2. 驗證
./scripts/deploy-production.sh status

# 3. 監控
./scripts/chroma-manager.sh logs
```

---

**提示**: 將此文件加入書籤，方便快速查找命令！
