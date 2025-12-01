#!/bin/bash

###############################################################################
# RAG Integration Tests Runner
# 用途：自動化運行 RAG 整合測試，包括 Chroma 設置和清理
# 使用方式：./scripts/run-rag-tests.sh [env]
###############################################################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境參數
ENV=${1:-test}

log_info "準備運行 RAG 整合測試（${ENV} 環境）..."

# 1. 設置 Chroma
log_info "步驟 1: 設置 Chroma 向量資料庫..."
./scripts/setup-chroma.sh setup "$ENV"

if [ $? -ne 0 ]; then
    log_error "Chroma 設置失敗"
    exit 1
fi

# 2. 載入環境變數
log_info "步驟 2: 載入環境變數..."
if [ -f ".env.chroma.${ENV}" ]; then
    export $(cat ".env.chroma.${ENV}" | grep -v '^#' | xargs)
    log_success "環境變數已載入"
else
    log_error "環境配置檔案不存在：.env.chroma.${ENV}"
    exit 1
fi

# 3. 驗證 Chroma 連接
log_info "步驟 3: 驗證 Chroma 連接..."
npx tsx scripts/test-chroma-connection.ts

if [ $? -ne 0 ]; then
    log_error "Chroma 連接驗證失敗"
    ./scripts/setup-chroma.sh stop
    exit 1
fi

# 4. 運行 RAG 整合測試
log_info "步驟 4: 運行 RAG 整合測試..."
npm test -- tests/integration/langchain-rag.integration.test.ts

TEST_EXIT_CODE=$?

# 5. 顯示測試結果
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "所有 RAG 測試通過！"
else
    log_error "部分 RAG 測試失敗"
fi

# 6. 清理（可選）
if [ "$ENV" = "test" ]; then
    log_info "步驟 5: 清理測試環境..."
    ./scripts/setup-chroma.sh stop
    log_success "測試環境已清理"
else
    log_info "Chroma 服務保持運行（${ENV} 環境）"
    log_info "如需停止，請運行：./scripts/setup-chroma.sh stop"
fi

exit $TEST_EXIT_CODE
