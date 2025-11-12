# API 使用指南

本文件提供司法正義論述生成器 API 的詳細使用說明和範例。

## 目錄

- [認證](#認證)
- [端點概覽](#端點概覽)
- [新聞搜尋](#新聞搜尋)
- [內容生成](#內容生成)
- [內容精煉](#內容精煉)
- [模板管理](#模板管理)
- [錯誤處理](#錯誤處理)
- [速率限制](#速率限制)
- [最佳實踐](#最佳實踐)

## 認證

所有 API 請求（除了健康檢查）都需要在 HTTP Header 中提供 API Key：

```http
X-API-Key: your-api-key-here
```

### 取得 API Key

API Key 由系統管理員配置在環境變數 `API_KEYS` 中。請聯繫管理員取得您的 API Key。

### 認證範例

```bash
curl -X POST http://localhost:8000/api/v1/news/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"keywords": ["司法改革"]}'
```

## 端點概覽

| 端點                       | 方法 | 說明         | 認證 |
| -------------------------- | ---- | ------------ | ---- |
| `/health`                  | GET  | 健康檢查     | 否   |
| `/openapi.json`            | GET  | OpenAPI 規格 | 否   |
| `/api-docs`                | GET  | Swagger UI   | 否   |
| `/api/v1/news/search`      | POST | 搜尋新聞     | 是   |
| `/api/v1/content/generate` | POST | 生成內容     | 是   |
| `/api/v1/content/refine`   | POST | 精煉內容     | 是   |
| `/api/v1/templates`        | GET  | 取得模板列表 | 是   |

## 新聞搜尋

搜尋與司法議題相關的新聞文章。

### 端點

```
POST /api/v1/news/search
```

### 請求參數

| 參數       | 類型     | 必填 | 說明                      |
| ---------- | -------- | ---- | ------------------------- |
| `keywords` | string[] | 是   | 搜尋關鍵字陣列（1-10 個） |

### 請求範例

```bash
curl -X POST http://localhost:8000/api/v1/news/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "keywords": ["司法改革", "受害者權益", "死刑"]
  }'
```

### 回應範例

```json
{
  "results": [
    {
      "title": "司法改革新進展：受害者權益保護法案通過",
      "source": "中央社",
      "published_date": "2025-11-10T10:30:00Z",
      "url": "https://example.com/news/1",
      "summary": "立法院今日三讀通過受害者權益保護法案..."
    },
    {
      "title": "死刑存廢爭議再起 民調顯示多數民眾支持維持",
      "source": "聯合報",
      "published_date": "2025-11-09T15:20:00Z",
      "url": "https://example.com/news/2",
      "summary": "最新民調顯示，超過七成民眾支持維持死刑制度..."
    }
  ],
  "total": 15
}
```

### JavaScript/TypeScript 範例

```typescript
async function searchNews(keywords: string[]): Promise<NewsSearchResponse> {
  const response = await fetch("http://localhost:8000/api/v1/news/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY!,
    },
    body: JSON.stringify({ keywords }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// 使用範例
const results = await searchNews(["司法改革", "受害者權益"]);
console.log(`找到 ${results.total} 篇相關新聞`);
```

### Python 範例

```python
import requests
import os

def search_news(keywords: list[str]) -> dict:
    url = "http://localhost:8000/api/v1/news/search"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": os.getenv("API_KEY")
    }
    data = {"keywords": keywords}

    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()

    return response.json()

# 使用範例
results = search_news(["司法改革", "受害者權益"])
print(f"找到 {results['total']} 篇相關新聞")
```

## 內容生成

根據使用者觀點和新聞背景，生成適合特定平台的論述內容。

### 端點

```
POST /api/v1/content/generate
```

### 請求參數

| 參數                 | 類型     | 必填 | 說明                                |
| -------------------- | -------- | ---- | ----------------------------------- |
| `user_input`         | string   | 是   | 使用者的觀點和方向                  |
| `topic_templates`    | string[] | 是   | 主題模板 ID 陣列                    |
| `platform_type`      | string   | 是   | 目標平台（instagram/facebook/line） |
| `selected_news_urls` | string[] | 否   | 選定的新聞 URL 陣列                 |

### 主題模板

- `victim_rights`: 受害者權益
- `anti_death_penalty`: 反廢死
- `judicial_injustice`: 司法不公

### 平台類型

- `instagram`: Instagram（視覺優先，5-15 個標籤）
- `facebook`: Facebook（段落分明，最多 2000 字）
- `line`: LINE（極簡短，最多 200 字）

### 請求範例

```bash
curl -X POST http://localhost:8000/api/v1/content/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "user_input": "我認為應該加強受害者權益保護，確保他們在司法程序中的聲音被聽見",
    "topic_templates": ["victim_rights"],
    "platform_type": "instagram",
    "selected_news_urls": [
      "https://example.com/news/1",
      "https://example.com/news/2"
    ]
  }'
```

### 回應範例

```json
{
  "variants": [
    {
      "text": "【為受害者發聲】\n\n根據最新通過的受害者權益保護法案，我們看到司法改革的重要一步。但這還不夠。\n\n每一個受害者都應該在司法程序中被尊重、被傾聽。他們的痛苦不應該被忽視，他們的權益必須被保障。\n\n讓我們一起為受害者發聲，推動更完善的保護機制。\n\n#受害者權益 #司法改革 #為正義發聲 #受害者保護 #司法正義",
      "image_suggestion": "一雙緊握的手，象徵支持與團結，背景是法院或天秤的剪影",
      "hashtags": [
        "受害者權益",
        "司法改革",
        "為正義發聲",
        "受害者保護",
        "司法正義"
      ],
      "metadata": {
        "variant_type": "理性分析",
        "tone": "客觀、數據導向",
        "word_count": 120
      }
    },
    {
      "text": "想像一下，如果是你的家人...\n\n當悲劇發生，受害者家屬不僅要承受失去至親的痛苦，還要面對冷漠的司法程序。\n\n他們需要的不只是同情，更是實質的保護和支持。\n\n每一個受害者都值得被溫柔對待，每一個聲音都應該被認真傾聽。\n\n#受害者權益 #同理心 #司法溫度 #為受害者發聲 #正義不能等",
      "image_suggestion": "溫暖的光線照進黑暗的房間，象徵希望與支持",
      "hashtags": [
        "受害者權益",
        "同理心",
        "司法溫度",
        "為受害者發聲",
        "正義不能等"
      ],
      "metadata": {
        "variant_type": "情感共鳴",
        "tone": "同理、感性",
        "word_count": 95
      }
    },
    {
      "text": "【行動起來】\n\n受害者權益保護法案已通過，但我們需要確保它被確實執行。\n\n你可以做的事：\n✅ 關注相關立法進度\n✅ 支持受害者保護組織\n✅ 分享正確資訊\n✅ 參與公聽會表達意見\n\n改變從你我開始。\n\n#受害者權益 #立即行動 #司法改革 #公民參與 #改變從現在開始",
      "image_suggestion": "向上的箭頭或握拳的手勢，象徵行動與改變",
      "hashtags": [
        "受害者權益",
        "立即行動",
        "司法改革",
        "公民參與",
        "改變從現在開始"
      ],
      "metadata": {
        "variant_type": "行動呼籲",
        "tone": "積極、號召",
        "word_count": 85
      }
    }
  ],
  "generation_id": "gen_abc123xyz"
}
```

### JavaScript/TypeScript 範例

```typescript
interface ContentGenerationRequest {
  user_input: string;
  topic_templates: string[];
  platform_type: "instagram" | "facebook" | "line";
  selected_news_urls?: string[];
}

async function generateContent(
  request: ContentGenerationRequest
): Promise<ContentGenerationResponse> {
  const response = await fetch(
    "http://localhost:8000/api/v1/content/generate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.API_KEY!,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// 使用範例
const result = await generateContent({
  user_input: "我認為應該加強受害者權益保護",
  topic_templates: ["victim_rights"],
  platform_type: "instagram",
  selected_news_urls: ["https://example.com/news/1"],
});

console.log(`生成了 ${result.variants.length} 個內容變體`);
result.variants.forEach((variant, index) => {
  console.log(`\n變體 ${index + 1} (${variant.metadata.variant_type}):`);
  console.log(variant.text);
});
```

## 內容精煉

根據使用者反饋，精煉已生成的內容。

### 端點

```
POST /api/v1/content/refine
```

### 請求參數

| 參數         | 類型   | 必填 | 說明                        |
| ------------ | ------ | ---- | --------------------------- |
| `content_id` | string | 是   | 內容 ID（從生成回應中取得） |
| `feedback`   | string | 是   | 改進建議（至少 10 個字元）  |

### 速率限制

每個內容 ID 每小時最多精煉 5 次。

### 請求範例

```bash
curl -X POST http://localhost:8000/api/v1/content/refine \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "content_id": "gen_abc123xyz",
    "feedback": "請加強情感共鳴的部分，並增加具體的行動建議"
  }'
```

### 回應範例

```json
{
  "text": "【為受害者發聲，從你我做起】\n\n想像一下，如果是你的家人遭遇不幸...\n\n根據最新通過的受害者權益保護法案，我們看到改變的可能。但法律只是第一步，真正的改變需要每個人的參與。\n\n你可以立即行動：\n✅ 關注並分享受害者的故事\n✅ 支持受害者保護組織\n✅ 參與公聽會表達意見\n✅ 監督法案的執行情況\n\n每一個聲音都重要，每一份關注都是力量。\n\n#受害者權益 #同理心 #立即行動 #司法改革 #改變從現在開始",
  "image_suggestion": "溫暖的光線照進黑暗的房間，前景是向上伸出的手，象徵希望、支持與行動",
  "hashtags": [
    "受害者權益",
    "同理心",
    "立即行動",
    "司法改革",
    "改變從現在開始"
  ],
  "metadata": {
    "variant_type": "情感共鳴 + 行動呼籲",
    "tone": "同理、積極",
    "word_count": 145,
    "refinement_count": 1
  }
}
```

### JavaScript/TypeScript 範例

```typescript
async function refineContent(
  contentId: string,
  feedback: string
): Promise<ContentVariant> {
  const response = await fetch("http://localhost:8000/api/v1/content/refine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY!,
    },
    body: JSON.stringify({
      content_id: contentId,
      feedback,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("已達到精煉次數限制，請稍後再試");
    }
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// 使用範例
const refined = await refineContent(
  "gen_abc123xyz",
  "請加強情感共鳴的部分，並增加具體的行動建議"
);

console.log("精煉後的內容：");
console.log(refined.text);
```

## 模板管理

取得可用的主題模板列表。

### 端點

```
GET /api/v1/templates
```

### 查詢參數

| 參數   | 類型   | 必填 | 說明                             |
| ------ | ------ | ---- | -------------------------------- |
| `lang` | string | 否   | 語言代碼（zh_TW/en），預設 zh_TW |

### 請求範例

```bash
curl -X GET "http://localhost:8000/api/v1/templates?lang=zh_TW" \
  -H "X-API-Key: your-api-key"
```

### 回應範例

```json
{
  "templates": [
    {
      "template_id": "victim_rights",
      "name": "受害者權益",
      "description": "關注受害者在司法程序中的權益保護",
      "tone_guidelines": "同理受害者處境，強調司法應保護受害者權益，呼籲社會關注與支持",
      "example_output": "每一個受害者都應該在司法程序中被尊重、被傾聽..."
    },
    {
      "template_id": "anti_death_penalty",
      "name": "反廢死",
      "description": "支持維持死刑制度，強調嚴懲重大犯罪",
      "tone_guidelines": "理性論述死刑的必要性，引用數據和案例，回應廢死論點",
      "example_output": "面對重大犯罪，死刑是社會正義的最後防線..."
    },
    {
      "template_id": "judicial_injustice",
      "name": "司法不公",
      "description": "揭露司法體系中的不公平現象",
      "tone_guidelines": "客觀分析司法問題，提出改革建議，避免過度情緒化",
      "example_output": "當司法無法伸張正義，人民對法治的信心將逐漸流失..."
    }
  ]
}
```

### JavaScript/TypeScript 範例

```typescript
async function getTemplates(
  lang: string = "zh_TW"
): Promise<TemplateListResponse> {
  const response = await fetch(
    `http://localhost:8000/api/v1/templates?lang=${lang}`,
    {
      headers: {
        "X-API-Key": process.env.API_KEY!,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// 使用範例
const templates = await getTemplates("zh_TW");
console.log("可用的模板：");
templates.templates.forEach((template) => {
  console.log(`- ${template.name} (${template.template_id})`);
  console.log(`  ${template.description}`);
});
```

## 錯誤處理

### 錯誤回應格式

所有錯誤回應都遵循統一格式：

```json
{
  "error": "ErrorType",
  "detail": "詳細錯誤訊息",
  "request_id": "req_abc123",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

### 常見錯誤碼

| 狀態碼 | 錯誤類型            | 說明                  |
| ------ | ------------------- | --------------------- |
| 400    | ValidationError     | 請求參數驗證失敗      |
| 401    | Unauthorized        | API Key 無效或缺失    |
| 429    | RateLimitExceeded   | 超過速率限制          |
| 500    | InternalServerError | 伺服器內部錯誤        |
| 502    | LLMProviderError    | LLM 服務錯誤          |
| 503    | NewsAPIUnavailable  | 新聞 API 暫時無法使用 |

### 錯誤處理範例

```typescript
async function handleAPICall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof Response) {
      const errorData = await error.json();

      switch (error.status) {
        case 400:
          console.error("請求參數錯誤:", errorData.detail);
          break;
        case 401:
          console.error("認證失敗，請檢查 API Key");
          break;
        case 429:
          console.error("請求過於頻繁，請稍後再試");
          if (errorData.retry_after) {
            console.log(`建議 ${errorData.retry_after} 秒後重試`);
          }
          break;
        case 503:
          console.error("服務暫時無法使用:", errorData.detail);
          break;
        default:
          console.error("API 錯誤:", errorData);
      }
    }
    throw error;
  }
}

// 使用範例
const result = await handleAPICall(() =>
  generateContent({
    user_input: "...",
    topic_templates: ["victim_rights"],
    platform_type: "instagram",
  })
);
```

## 速率限制

### 限制規則

- **全域限制**: 每個 IP 每 15 分鐘最多 100 個請求
- **內容生成**: 每分鐘最多 10 個請求
- **內容精煉**: 每個內容 ID 每小時最多 5 次

### 回應標頭

速率限制資訊會包含在回應標頭中：

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

### 處理速率限制

```typescript
async function makeRequestWithRetry<T>(
  apiCall: () => Promise<Response>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await apiCall();

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
      console.log(`速率限制，${retryAfter} 秒後重試...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  }

  throw new Error("超過最大重試次數");
}
```

## 最佳實踐

### 1. 使用環境變數管理 API Key

```typescript
// ❌ 不要硬編碼 API Key
const API_KEY = "sk-abc123...";

// ✅ 使用環境變數
const API_KEY = process.env.API_KEY;
```

### 2. 實作錯誤處理和重試機制

```typescript
async function robustAPICall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;

      // 如果是客戶端錯誤（4xx），不要重試
      if (
        error instanceof Response &&
        error.status >= 400 &&
        error.status < 500
      ) {
        throw error;
      }

      // 指數退避
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### 3. 快取常用資料

```typescript
class APIClient {
  private templateCache: Map<string, TemplateListResponse> = new Map();

  async getTemplates(lang: string = "zh_TW"): Promise<TemplateListResponse> {
    // 檢查快取
    if (this.templateCache.has(lang)) {
      return this.templateCache.get(lang)!;
    }

    // 呼叫 API
    const templates = await this.fetchTemplates(lang);

    // 快取結果
    this.templateCache.set(lang, templates);

    return templates;
  }
}
```

### 4. 批次處理請求

```typescript
async function generateMultipleContents(
  requests: ContentGenerationRequest[]
): Promise<ContentGenerationResponse[]> {
  // 使用 Promise.all 並行處理
  const results = await Promise.all(
    requests.map((request) => generateContent(request))
  );

  return results;
}
```

### 5. 監控和日誌

```typescript
async function loggedAPICall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await apiCall();
    const duration = Date.now() - startTime;

    console.log(`[${name}] 成功 (${duration}ms)`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[${name}] 失敗 (${duration}ms):`, error);

    throw error;
  }
}

// 使用範例
const result = await loggedAPICall("generateContent", () =>
  generateContent(request)
);
```

## 完整範例

### 完整的內容生成流程

```typescript
import fetch from "node-fetch";

class AdvocacyContentClient {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.detail}`);
    }

    return await response.json();
  }

  async searchNews(keywords: string[]): Promise<NewsSearchResponse> {
    return this.request("/api/v1/news/search", {
      method: "POST",
      body: JSON.stringify({ keywords }),
    });
  }

  async generateContent(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResponse> {
    return this.request("/api/v1/content/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async refineContent(
    contentId: string,
    feedback: string
  ): Promise<ContentVariant> {
    return this.request("/api/v1/content/refine", {
      method: "POST",
      body: JSON.stringify({ content_id: contentId, feedback }),
    });
  }

  async getTemplates(lang: string = "zh_TW"): Promise<TemplateListResponse> {
    return this.request(`/api/v1/templates?lang=${lang}`);
  }
}

// 使用範例
async function main() {
  const client = new AdvocacyContentClient(
    "http://localhost:8000",
    process.env.API_KEY!
  );

  try {
    // 1. 搜尋新聞
    console.log("搜尋相關新聞...");
    const newsResults = await client.searchNews(["司法改革", "受害者權益"]);
    console.log(`找到 ${newsResults.total} 篇新聞`);

    // 2. 生成內容
    console.log("\n生成論述內容...");
    const content = await client.generateContent({
      user_input: "我認為應該加強受害者權益保護",
      topic_templates: ["victim_rights"],
      platform_type: "instagram",
      selected_news_urls: newsResults.results.slice(0, 3).map((n) => n.url),
    });

    console.log(`生成了 ${content.variants.length} 個內容變體`);

    // 3. 顯示第一個變體
    const firstVariant = content.variants[0];
    console.log("\n第一個變體：");
    console.log(firstVariant.text);
    console.log("\n標籤:", firstVariant.hashtags.join(" "));

    // 4. 精煉內容（如果需要）
    console.log("\n精煉內容...");
    const refined = await client.refineContent(
      content.generation_id,
      "請加強情感共鳴，並增加具體行動建議"
    );

    console.log("\n精煉後的內容：");
    console.log(refined.text);
  } catch (error) {
    console.error("錯誤:", error);
  }
}

main();
```

## 相關資源

- [OpenAPI 規格](http://localhost:8000/openapi.json)
- [Swagger UI](http://localhost:8000/api-docs)
- [MCP 整合指南](./mcp-guide.md)
- [AWS 部署指南](./deployment-guide.md)

## 支援

如有問題或建議，請透過 GitHub Issues 聯繫。
