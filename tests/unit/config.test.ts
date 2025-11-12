import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Configuration Management', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to reload config
    jest.resetModules();
  });

  it('should load default configuration', async () => {
    // Set minimal required env vars
    process.env.SERVICE_MODE = 'unified';
    process.env.API_KEYS = 'test-key-1,test-key-2';

    const { config } = await import('../../src/config.js');

    expect(config.serviceMode).toBe('unified');
    expect(config.port).toBe(8000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.awsRegion).toBe('us-east-1');
    expect(config.bedrockModelId).toBe('anthropic.claude-sonnet-4-5-20250929-v1:0');
    expect(config.logLevel).toBe('info');
  });

  it('should parse API keys correctly', async () => {
    process.env.API_KEYS = 'key1,key2,key3';

    const { config } = await import('../../src/config.js');

    expect(config.apiKeys).toEqual(['key1', 'key2', 'key3']);
  });

  it('should support different service modes', async () => {
    process.env.SERVICE_MODE = 'api-only';

    const { config } = await import('../../src/config.js');

    expect(config.serviceMode).toBe('api-only');
  });

  it('should coerce port to number', async () => {
    process.env.PORT = '3000';

    const { config } = await import('../../src/config.js');

    expect(config.port).toBe(3000);
    expect(typeof config.port).toBe('number');
  });

  it('should use custom cache directory', async () => {
    process.env.CACHE_DIR = '/custom/cache';

    const { config } = await import('../../src/config.js');

    expect(config.cacheDir).toBe('/custom/cache');
  });

  it('should validate log level enum', async () => {
    process.env.LOG_LEVEL = 'debug';

    const { config } = await import('../../src/config.js');

    expect(config.logLevel).toBe('debug');
  });
});
