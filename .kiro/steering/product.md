# Product Guidelines

## Product Vision

司法正義 AI 系統旨在透過 AI agent 推動反廢死與打擊司法貪腐的雙重目標，建立自動化系統以提升輿情掌握、論述生成與司法資料分析能力，強化民間監督與社群動員能力，促進法治與正義落實。

## Core Modules

### Module 1: 輿情監測模組 (Public Opinion Monitoring)

**Purpose**: 即時監測社群媒體與新聞平台的司法相關輿情

**Data Sources**:

- PTT (批踢踢實業坊)
- Facebook
- Google News

**Key Features**:

- 自動化資料爬取
- BERT 情緒分析
- 輿情趨勢視覺化
- 每日輿情摘要

**Priority**: ⭐️⭐️⭐️⭐️ (High)

### Module 2: 反廢死論述生成器 (Advocacy Content Generator)

**Purpose**: 自動生成針對不同平台和受眾的反廢死論述內容

**Key Features**:

- 新聞背景搜尋與整合
- 多平台內容生成 (Instagram, Facebook, LINE)
- 多變體內容生成 (理性分析、情感共鳴、行動呼籲)
- 內容精煉與優化
- 模板管理系統

**Target Platforms**:

- Instagram: 視覺化內容，hashtag 優化
- Facebook: 長文論述，社群互動
- LINE: 簡潔訊息，即時傳播

**Content Variants**:

- 理性分析 (Rational Analysis): 數據驅動、邏輯論證
- 情感共鳴 (Emotional Resonance): 受害者視角、同理心
- 行動呼籲 (Call to Action): 動員參與、政策倡議

**Priority**: ⭐️⭐️⭐️⭐️ (High)

### Module 3: 判決資料分析模組 (Judicial Data Analysis)

**Purpose**: 分析司法判決資料，揭露司法不公與貪腐問題

**Data Sources**:

- 司法院法學資料庫

**Key Features**:

- 判決書自動抽取與解析
- 量刑趨勢統計分析
- 法官判決模式分析
- 異常判決偵測
- 視覺化儀表板

**Priority**: ⭐️⭐️⭐️⭐️ (High)

## Product Principles

### User-Centric Design

- 介面簡潔直觀，降低使用門檻
- 提供清晰的操作指引和範例
- 支援多語言 (繁體中文優先，英文次之)

### Content Quality

- 確保生成內容的事實準確性
- 提供新聞來源引用和驗證
- 支援人工審核和精煉機制
- 避免極端或不當言論

### Platform Optimization

- 針對不同社群平台優化內容格式
- 遵守各平台的內容規範和限制
- 優化內容的傳播效果和互動率

### Ethical Considerations

- 尊重受害者隱私和尊嚴
- 避免煽動仇恨或暴力
- 提供平衡的觀點和論述
- 遵守相關法律法規

## Success Metrics

### Engagement Metrics

- 內容生成數量和頻率
- 社群互動率 (按讚、分享、留言)
- 內容觸及人數和曝光率

### Quality Metrics

- 內容準確性和可信度
- 使用者滿意度評分
- 精煉次數和改善幅度

### Impact Metrics

- 輿情影響力和話題熱度
- 政策倡議成效
- 社群動員參與度

## Roadmap

### Phase 1: MVP (4 weeks)

- 完成論述生成器核心功能
- 支援 3 個主題模板
- 支援 3 個平台格式
- 基本 API 和 MCP 整合

### Phase 2: Enhancement (4-8 weeks)

- 完成輿情監測模組
- 擴充模板庫和變體類型
- 優化內容生成品質
- 增強快取和效能

### Phase 3: Advanced Features (8-12 weeks)

- 完成判決分析模組
- 整合三大模組
- 建立統一儀表板
- 實作進階分析功能

### Phase 4: Scale & Optimize (12+ weeks)

- 系統效能優化
- 擴展資料來源
- 增強 AI 模型能力
- 建立社群生態系統

## Target Users

### Primary Users

- 反廢死倡議組織
- 司法改革團體
- 受害者家屬支持團體
- 社會運動工作者

### Secondary Users

- 媒體工作者
- 法律專業人士
- 學術研究人員
- 關心司法議題的公民

## Competitive Advantages

1. **AI-Powered Automation**: 大幅降低內容生成的時間和人力成本
2. **Multi-Platform Optimization**: 針對不同平台優化內容格式和策略
3. **Data-Driven Insights**: 結合輿情監測和判決分析提供深度洞察
4. **Flexible Integration**: 支援 REST API 和 MCP 雙重整合方式
5. **Open Source Potential**: 可開放原始碼促進社群協作

## Risk Management

### Technical Risks

- LLM 生成內容品質不穩定 → 實作多輪精煉和人工審核
- 外部 API 服務中斷 → 實作重試機制和降級策略
- 系統效能瓶頸 → 實作快取和非同步處理

### Content Risks

- 生成不當或極端內容 → 實作內容過濾和審核機制
- 事實查核失誤 → 提供新聞來源引用和驗證
- 侵犯隱私或名譽 → 實作敏感資訊過濾

### Legal Risks

- 違反平台使用條款 → 遵守各平台規範
- 侵犯著作權 → 確保內容原創性
- 違反言論自由界線 → 建立內容審核標準

## Future Opportunities

1. **擴展議題範圍**: 從反廢死擴展到其他司法改革議題
2. **國際化**: 支援其他語言和地區的司法倡議
3. **社群平台**: 建立使用者社群和內容分享平台
4. **商業模式**: 提供付費進階功能和客製化服務
5. **合作夥伴**: 與 NGO、媒體、學術機構建立合作關係
