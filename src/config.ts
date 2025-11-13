import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const ConfigSchema = z.object({
  // Service configuration
  serviceMode: z.enum(['unified', 'api-only', 'mcp-only']).default('unified'),
  mcpTransport: z.enum(['stdio', 'streamable-http']).default('stdio'),
  port: z.coerce.number().default(8000),
  host: z.string().default('0.0.0.0'),

  // AWS configuration
  awsRegion: z.string().default('us-east-1'),

  // Bedrock configuration
  bedrockModelId: z.string().default('anthropic.claude-sonnet-4-5-20250929-v1:0'),
  bedrockRegion: z.string().default('us-east-1'),

  // News API configuration
  newsApiKey: z.string().optional(),
  newsApiProvider: z.enum(['google', 'newsapi']).default('google'),

  // Cache configuration
  cacheDir: z.string().default('.cache'),
  cacheTtl: z.coerce.number().default(3600),

  // Logging configuration
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  logFormat: z.enum(['json', 'text']).default('json'),

  // Rate limiting
  refineLimitPerHour: z.coerce.number().default(5),

  // API authentication
  apiKeys: z.string().transform(keys => keys.split(',')).default(''),
});

export type Config = z.infer<typeof ConfigSchema>;

// Parse and validate configuration
function loadConfig(): Config {
  const rawConfig = {
    serviceMode: process.env.SERVICE_MODE,
    mcpTransport: process.env.MCP_TRANSPORT,
    port: process.env.PORT,
    host: process.env.HOST,
    awsRegion: process.env.AWS_REGION,
    bedrockModelId: process.env.BEDROCK_MODEL_ID,
    bedrockRegion: process.env.BEDROCK_REGION,
    newsApiKey: process.env.NEWS_API_KEY,
    newsApiProvider: process.env.NEWS_API_PROVIDER,
    cacheDir: process.env.CACHE_DIR,
    cacheTtl: process.env.CACHE_TTL,
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT,
    refineLimitPerHour: process.env.REFINE_LIMIT_PER_HOUR,
    apiKeys: process.env.API_KEYS,
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      console.error(error.errors);
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

export const config = loadConfig();
