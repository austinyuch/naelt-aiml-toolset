#!/bin/bash

###############################################################################
# Chroma Vector Database Setup Script
# 用途：自動化設置 Chroma 向量資料庫，支援開發、測試和生產環境
# 使用方式：
#   ./scripts/setup-chroma.sh [dev|test|prod]
###############################################################################

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查必要工具
check_prerequisites() {
    log_info "檢查必要工具..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝。請先安裝 Docker。"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安裝。請先安裝 Docker Compose。"
        exit 1
    fi
    
    log_success "所有必要工具已安裝"
}

# 環境設置
setup_environment() {
    local env=$1
    log_info "設置 ${env} 環境..."
    
    # 創建環境變數檔案
    local env_file=".env.chroma.${env}"
    
    case $env in
        dev)
            cat > "$env_file" << EOF
# Chroma 開發環境配置
CHROMA_PORT=8000
CHROMA_UI_PORT=3001
CHROMA_TELEMETRY=FALSE
CHROMA_AUTH_PROVIDER=
CHROMA_AUTH_TOKEN=
CHROMA_AUTH_HEADER=X-Chroma-Token
CHROMA_URL=http://localhost:8000
EOF
            ;;
        test)
            cat > "$env_file" << EOF
# Chroma 測試環境配置
CHROMA_PORT=8001
CHROMA_UI_PORT=3002
CHROMA_TELEMETRY=FALSE
CHROMA_AUTH_PROVIDER=chromadb.auth.token.TokenAuthCredentialsProvider
CHROMA_AUTH_TOKEN=test-token-$(openssl rand -hex 16)
CHROMA_AUTH_HEADER=X-Chroma-Token
CHROMA_URL=http://localhost:8001
EOF
            ;;
        prod)
            # 生產環境使用強密碼
            local auth_token=$(openssl rand -base64 32)
            cat > "$env_file" << EOF
# Chroma 生產環境配置
CHROMA_PORT=8000
CHROMA_TELEMETRY=FALSE
CHROMA_AUTH_PROVIDER=chromadb.auth.token.TokenAuthCredentialsProvider
CHROMA_AUTH_TOKEN=${auth_token}
CHROMA_AUTH_HEADER=X-Chroma-Token
CHROMA_URL=http://chroma:8000
EOF
            log_warning "生產環境認證 Token 已生成，請妥善保管："
            log_warning "Token: ${auth_token}"
            ;;
        *)
            log_error "未知環境：${env}。請使用 dev、test 或 prod。"
            exit 1
            ;;
    esac
    
    log_success "環境配置已創建：${env_file}"
}

# 啟動 Chroma
start_chroma() {
    local env=$1
    local env_file=".env.chroma.${env}"
    
    log_info "啟動 Chroma 向量資料庫（${env} 環境）..."
    
    # 載入環境變數
    if [ -f "$env_file" ]; then
        export $(cat "$env_file" | grep -v '^#' | xargs)
    else
        log_error "環境配置檔案不存在：${env_file}"
        exit 1
    fi
    
    # 根據環境決定是否啟動 UI
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.chroma.yml --profile dev up -d
    else
        docker-compose -f docker-compose.chroma.yml up -d
    fi
    
    log_success "Chroma 容器已啟動"
}

# 等待 Chroma 就緒
wait_for_chroma() {
    local max_attempts=30
    local attempt=1
    local chroma_url="${CHROMA_URL:-http://localhost:8000}"
    
    log_info "等待 Chroma 服務就緒..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "${chroma_url}/api/v1/heartbeat" > /dev/null 2>&1; then
            log_success "Chroma 服務已就緒！"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
    log_error "Chroma 服務啟動超時"
    return 1
}

# 驗證 Chroma 連接
verify_chroma() {
    local chroma_url="${CHROMA_URL:-http://localhost:8000}"
    
    log_info "驗證 Chroma 連接..."
    
    # 測試心跳
    if ! curl -s -f "${chroma_url}/api/v1/heartbeat" > /dev/null; then
        log_error "無法連接到 Chroma 服務"
        return 1
    fi
    
    # 獲取版本信息
    local version=$(curl -s "${chroma_url}/api/v1/version" | grep -o '"[0-9.]*"' | tr -d '"')
    log_success "Chroma 版本：${version}"
    
    # 列出集合
    log_info "當前集合："
    curl -s "${chroma_url}/api/v1/collections" | python3 -m json.tool 2>/dev/null || echo "[]"
    
    return 0
}

# 停止 Chroma
stop_chroma() {
    log_info "停止 Chroma 服務..."
    docker-compose -f docker-compose.chroma.yml down
    log_success "Chroma 服務已停止"
}

# 清理數據
cleanup_data() {
    log_warning "這將刪除所有 Chroma 數據！"
    read -p "確定要繼續嗎？(yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log_info "清理 Chroma 數據..."
        docker-compose -f docker-compose.chroma.yml down -v
        log_success "Chroma 數據已清理"
    else
        log_info "取消清理操作"
    fi
}

# 顯示狀態
show_status() {
    log_info "Chroma 服務狀態："
    docker-compose -f docker-compose.chroma.yml ps
    
    echo ""
    log_info "Chroma 日誌（最後 20 行）："
    docker-compose -f docker-compose.chroma.yml logs --tail=20 chroma
}

# 顯示使用說明
show_usage() {
    cat << EOF
使用方式：
    $0 [command] [environment]

命令：
    setup [env]     - 設置並啟動 Chroma（env: dev|test|prod，預設 dev）
    start [env]     - 啟動 Chroma
    stop            - 停止 Chroma
    restart [env]   - 重啟 Chroma
    status          - 顯示 Chroma 狀態
    verify          - 驗證 Chroma 連接
    cleanup         - 清理所有數據（危險操作）
    help            - 顯示此說明

範例：
    $0 setup dev        # 設置開發環境
    $0 setup test       # 設置測試環境
    $0 setup prod       # 設置生產環境
    $0 start dev        # 啟動開發環境
    $0 stop             # 停止服務
    $0 status           # 查看狀態
    $0 verify           # 驗證連接
EOF
}

# 主函數
main() {
    local command=${1:-help}
    local env=${2:-dev}
    
    case $command in
        setup)
            check_prerequisites
            setup_environment "$env"
            start_chroma "$env"
            wait_for_chroma
            verify_chroma
            log_success "Chroma 設置完成！"
            log_info "Chroma URL: ${CHROMA_URL:-http://localhost:8000}"
            if [ "$env" = "dev" ]; then
                log_info "Chroma UI: http://localhost:${CHROMA_UI_PORT:-3001}"
            fi
            ;;
        start)
            check_prerequisites
            start_chroma "$env"
            wait_for_chroma
            verify_chroma
            ;;
        stop)
            stop_chroma
            ;;
        restart)
            stop_chroma
            sleep 2
            start_chroma "$env"
            wait_for_chroma
            verify_chroma
            ;;
        status)
            show_status
            ;;
        verify)
            verify_chroma
            ;;
        cleanup)
            cleanup_data
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "未知命令：${command}"
            show_usage
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@"
