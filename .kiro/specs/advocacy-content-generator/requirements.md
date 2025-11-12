# 需求文件

## 簡介

司法正義論述生成器後端服務是一個本地執行的 API 服務，提供 RESTful API 和 MCP (Model Context Protocol) 介面。服務協助使用者針對受害者權益、反廢死和司法不公等議題，透過新聞搜尋和 AI 生成，產出適合不同社群平台的論述內容。

## 術語表

- **API_Service**: 司法正義論述生成器後端服務
- **Client**: API 客戶端（前端應用、CLI 工具、MCP 客戶端）
- **User_Input**: 使用者提交的方向和基本觀點
- **News_API**: 新聞搜尋 API（Google News API 或類似服務）
- **Search_Result**: 新聞搜尋結果
- **Topic_Template**: 主題模板（victim_rights、anti_death_penalty、judicial_injustice）
- **Platform_Type**: 目標平台類型（instagram、facebook、line）
- **Generated_Content**: 生成的論述內容
- **Content_Variant**: 內容變體（同一請求的不同版本）
- **Image_Suggestion**: 圖片建議描述
- **API_Endpoint**: RESTful API 端點
- **MCP_Tool**: MCP 協議工具
- **Response_Time**: API 回應時間（以毫秒為單位）
- **LLM_Provider**: 大型語言模型提供者（OpenAI GPT-4 或相容服務）

## 需求

### 需求 1：RESTful API 端點定義

**使用者故事：** 作為 API 客戶端開發者，我希望後端提供清晰的 RESTful API 端點，以便整合論述生成功能。

#### 驗收標準

1. THE API_Service SHALL provide OpenAPI 3.0 specification document at /openapi.json endpoint
2. THE API_Service SHALL expose API_Endpoint for news search at POST /api/v1/news/search
3. THE API_Service SHALL expose API_Endpoint for content generation at POST /api/v1/content/generate
4. THE API_Service SHALL expose API_Endpoint for content refinement at POST /api/v1/content/refine
5. THE API_Service SHALL expose API_Endpoint for template listing at GET /api/v1/templates

### 需求 2：新聞搜尋 API

**使用者故事：** 作為客戶端應用，我希望能透過 API 搜尋相關新聞，以便為內容生成提供事實依據。

#### 驗收標準

1. WHEN Client sends POST request to /api/v1/news/search with keywords, THE API_Service SHALL return Search_Result within 10000 milliseconds
2. THE API_Service SHALL accept request body with keywords field containing 1 to 10 search terms
3. THE API_Service SHALL return JSON response with minimum 5 and maximum 20 Search_Result items
4. THE API_Service SHALL include title, source, published_date, url, and summary fields in each Search_Result
5. THE API_Service SHALL integrate with News_API and handle API rate limits with exponential backoff retry up to 3 attempts

### 需求 3：內容生成 API

**使用者故事：** 作為客戶端應用，我希望能透過 API 生成論述內容，以便提供給使用者選擇。

#### 驗收標準

1. WHEN Client sends POST request to /api/v1/content/generate, THE API_Service SHALL return Generated_Content within 30000 milliseconds
2. THE API_Service SHALL accept request body with user_input, topic_templates, platform_type, and selected_news_urls fields
3. THE API_Service SHALL validate topic_templates contains only valid values: victim_rights, anti_death_penalty, or judicial_injustice
4. THE API_Service SHALL generate 3 Content_Variant items with different tones and angles
5. THE API_Service SHALL include text, image_suggestion, hashtags, and metadata fields in each Content_Variant

### 需求 4：內容精煉 API

**使用者故事：** 作為客戶端應用，我希望能透過 API 精煉已生成的內容，以便根據使用者反饋調整。

#### 驗收標準

1. WHEN Client sends POST request to /api/v1/content/refine with content_id and feedback, THE API_Service SHALL return refined Generated_Content within 20000 milliseconds
2. THE API_Service SHALL accept feedback field with minimum 10 characters describing requested changes
3. THE API_Service SHALL maintain original Topic_Template and Platform_Type settings during refinement
4. THE API_Service SHALL limit refinement iterations to 5 per content_id within 1 hour period
5. THE API_Service SHALL return HTTP 429 status code when refinement limit is exceeded

### 需求 5：主題模板管理

**使用者故事：** 作為客戶端應用，我希望能查詢可用的主題模板，以便提供給使用者選擇。

#### 驗收標準

1. WHEN Client sends GET request to /api/v1/templates, THE API_Service SHALL return template list within 500 milliseconds
2. THE API_Service SHALL return JSON array with template_id, name, description, and tone_guidelines fields
3. THE API_Service SHALL provide templates for victim_rights, anti_death_penalty, and judicial_injustice topics
4. THE API_Service SHALL include example_output field demonstrating template style for each template
5. THE API_Service SHALL support query parameter lang with values zh_TW and en for localized descriptions

### 需求 6：MCP 工具介面

**使用者故事：** 作為 MCP 客戶端，我希望後端提供 MCP 協議工具，以便透過標準化介面使用論述生成功能。

#### 驗收標準

1. THE API_Service SHALL implement MCP_Tool named search_news for news searching functionality
2. THE API_Service SHALL implement MCP_Tool named generate_content for content generation functionality
3. THE API_Service SHALL implement MCP_Tool named refine_content for content refinement functionality
4. THE API_Service SHALL provide tool descriptions and parameter schemas following MCP specification
5. THE API_Service SHALL expose MCP endpoint at /mcp for tool discovery and invocation

### 需求 7：LLM 整合與提示工程

**使用者故事：** 作為系統管理員，我希望後端能整合 LLM 服務並使用優化的提示模板，以便生成高品質內容。

#### 驗收標準

1. THE API_Service SHALL integrate with LLM_Provider using API key from environment variable
2. THE API_Service SHALL use separate prompt templates for each Topic_Template with tone and style guidelines
3. WHEN generating content, THE API_Service SHALL include news context and User_Input in LLM prompt
4. THE API_Service SHALL set LLM temperature parameter to 0.7 for balanced creativity and consistency
5. THE API_Service SHALL limit LLM response tokens to 1000 for cost optimization

### 需求 8：平台格式優化

**使用者故事：** 作為客戶端應用，我希望生成的內容能針對不同平台優化，以便直接用於發布。

#### 驗收標準

1. WHERE Platform_Type is instagram, THE API_Service SHALL generate content with 5 to 15 hashtags and visual-first structure
2. WHERE Platform_Type is facebook, THE API_Service SHALL generate content with paragraph breaks and maximum 2000 characters
3. WHERE Platform_Type is line, THE API_Service SHALL generate content with maximum 200 characters for easy forwarding
4. THE API_Service SHALL include platform-specific formatting metadata in response
5. THE API_Service SHALL validate generated content length against Platform_Type constraints before returning

### 需求 9：錯誤處理與驗證

**使用者故事：** 作為客戶端開發者，我希望 API 能提供清晰的錯誤訊息，以便快速診斷問題。

#### 驗收標準

1. WHEN Client sends invalid request, THE API_Service SHALL return HTTP 400 status with detailed error message
2. THE API_Service SHALL validate all required fields and return field-specific error messages
3. IF News_API is unavailable, THEN THE API_Service SHALL return HTTP 503 status with retry-after header
4. IF LLM_Provider returns error, THEN THE API_Service SHALL return HTTP 502 status with error details
5. THE API_Service SHALL log all errors with request_id for traceability

### 需求 10：本地執行與配置

**使用者故事：** 作為開發者，我希望能在本地環境輕鬆啟動服務，以便開發和測試。

#### 驗收標準

1. THE API_Service SHALL start on localhost with configurable port from environment variable PORT
2. THE API_Service SHALL load configuration from .env file including LLM_Provider API key and News_API credentials
3. THE API_Service SHALL provide health check endpoint at GET /health returning status and version
4. THE API_Service SHALL log startup information including listening address and loaded configuration
5. THE API_Service SHALL support graceful shutdown handling SIGTERM and SIGINT signals within 5 seconds
