/**
 * Performance Baseline Tests
 * 
 * These tests establish and verify performance baselines for the API.
 * They measure response times and ensure they meet SLA requirements.
 * 
 * Performance Targets:
 * - Health Check: < 50ms
 * - Template Listing: < 500ms
 * - News Search: < 10s
 * - Content Generation: < 30s
 * - Content Refinement: < 20s
 */

import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../src/api/app';
import { ContentOrchestrator } from '../../src/services/ContentOrchestrator';
import { NewsSearchService } from '../../src/services/NewsSearchService';
import { ContentGenerationService } from '../../src/services/ContentGenerationService';
import { TemplateManagementService } from '../../src/services/TemplateManagementService';
import { NewsAPIClient } from '../../src/clients/NewsAPIClient';
import { BedrockClient } from '../../src/clients/BedrockClient';
import { CacheManager } from '../../src/core/cache';
import { RateLimiter } from '../../src/core/rateLimiter';
import { PromptBuilder } from '../../src/prompts/PromptBuilder';
import { PromptTemplateLoader } from '../../src/prompts/PromptTemplateLoader';
import { config } from '../../src/config';

interface PerformanceMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

function calculateMetrics(times: number[]): PerformanceMetrics {
  const sorted = times.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

describe('Performance Baseline Tests', () => {
  let app: Express;
  let orchestrator: ContentOrchestrator;
  const validApiKey = 'test-api-key-performance';

  beforeAll(async () => {
    // Initialize services
    const newsApiClient = new NewsAPIClient(config.newsApiKey || 'mock-key');
    const bedrockClient = new BedrockClient(config.awsRegion);
    const cacheManager = new CacheManager();
    const rateLimiter = new RateLimiter();
    const templateService = new TemplateManagementService();
    const promptLoader = new PromptTemplateLoader();
    const promptBuilder = new PromptBuilder(promptLoader);
    const newsService = new NewsSearchService(newsApiClient, cacheManager);
    const contentService = new ContentGenerationService(bedrockClient, promptBuilder, rateLimiter);
    
    orchestrator = new ContentOrchestrator(newsService, contentService, templateService);
    app = createExpressApp(orchestrator);

    // Set test API key
    process.env.API_KEYS = validApiKey;
  });

  afterAll(() => {
    delete process.env.API_KEYS;
  });

  describe('Health Check Performance', () => {
    it('should respond within 50ms (p95)', async () => {
      const times: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app).get('/health').expect(200);
        times.push(Date.now() - start);
      }

      const metrics = calculateMetrics(times);

      console.log('Health Check Performance:');
      console.log(`  Min: ${metrics.min}ms`);
      console.log(`  Max: ${metrics.max}ms`);
      console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`  P50: ${metrics.p50}ms`);
      console.log(`  P95: ${metrics.p95}ms`);
      console.log(`  P99: ${metrics.p99}ms`);

      expect(metrics.p95).toBeLessThan(50);
      expect(metrics.avg).toBeLessThan(30);
    }, 30000);

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const start = Date.now();

      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => request(app).get('/health').expect(200));

      await Promise.all(promises);

      const totalTime = Date.now() - start;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log(`Concurrent Health Checks (${concurrentRequests} requests):`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Avg per Request: ${avgTimePerRequest.toFixed(2)}ms`);

      expect(avgTimePerRequest).toBeLessThan(100);
    }, 30000);
  });

  describe('Template Listing Performance', () => {
    it('should respond within 500ms (p95)', async () => {
      const times: number[] = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .get('/api/v1/templates')
          .set('X-API-Key', validApiKey)
          .expect(200);
        times.push(Date.now() - start);
      }

      const metrics = calculateMetrics(times);

      console.log('Template Listing Performance:');
      console.log(`  Min: ${metrics.min}ms`);
      console.log(`  Max: ${metrics.max}ms`);
      console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`  P50: ${metrics.p50}ms`);
      console.log(`  P95: ${metrics.p95}ms`);
      console.log(`  P99: ${metrics.p99}ms`);

      expect(metrics.p95).toBeLessThan(500);
      expect(metrics.avg).toBeLessThan(200);
    }, 60000);

    it('should benefit from caching', async () => {
      // First request (cold cache)
      const start1 = Date.now();
      await request(app)
        .get('/api/v1/templates')
        .set('X-API-Key', validApiKey)
        .expect(200);
      const time1 = Date.now() - start1;

      // Second request (warm cache)
      const start2 = Date.now();
      await request(app)
        .get('/api/v1/templates')
        .set('X-API-Key', validApiKey)
        .expect(200);
      const time2 = Date.now() - start2;

      console.log('Template Caching:');
      console.log(`  Cold Cache: ${time1}ms`);
      console.log(`  Warm Cache: ${time2}ms`);
      console.log(`  Improvement: ${((1 - time2 / time1) * 100).toFixed(1)}%`);

      // Warm cache should be faster or similar
      expect(time2).toBeLessThanOrEqual(time1 * 1.5);
    });
  });

  describe('News Search Performance', () => {
    it('should respond within 10s (p95)', async () => {
      const times: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/v1/news/search')
          .set('X-API-Key', validApiKey)
          .send({ keywords: ['司法改革'] })
          .expect(200);
        times.push(Date.now() - start);
      }

      const metrics = calculateMetrics(times);

      console.log('News Search Performance:');
      console.log(`  Min: ${metrics.min}ms`);
      console.log(`  Max: ${metrics.max}ms`);
      console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`  P50: ${metrics.p50}ms`);
      console.log(`  P95: ${metrics.p95}ms`);
      console.log(`  P99: ${metrics.p99}ms`);

      expect(metrics.p95).toBeLessThan(10000);
      expect(metrics.avg).toBeLessThan(5000);
    }, 120000);

    it('should handle varying keyword counts efficiently', async () => {
      const keywordCounts = [1, 3, 5, 10];
      const results: { count: number; time: number }[] = [];

      for (const count of keywordCounts) {
        const keywords = Array(count).fill('test');
        const start = Date.now();
        
        await request(app)
          .post('/api/v1/news/search')
          .set('X-API-Key', validApiKey)
          .send({ keywords })
          .expect(200);
        
        const time = Date.now() - start;
        results.push({ count, time });
      }

      console.log('News Search by Keyword Count:');
      results.forEach(r => {
        console.log(`  ${r.count} keywords: ${r.time}ms`);
      });

      // All should be under 10s
      results.forEach(r => {
        expect(r.time).toBeLessThan(10000);
      });
    }, 120000);
  });

  describe('Content Generation Performance', () => {
    it('should respond within 30s (p95)', async () => {
      const times: number[] = [];
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/v1/content/generate')
          .set('X-API-Key', validApiKey)
          .send({
            user_input: '測試內容生成效能',
            topic_templates: ['victim_rights'],
            platform_type: 'instagram',
            selected_news_urls: []
          })
          .expect(200);
        times.push(Date.now() - start);
      }

      const metrics = calculateMetrics(times);

      console.log('Content Generation Performance:');
      console.log(`  Min: ${metrics.min}ms`);
      console.log(`  Max: ${metrics.max}ms`);
      console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`  P50: ${metrics.p50}ms`);
      console.log(`  P95: ${metrics.p95}ms`);
      console.log(`  P99: ${metrics.p99}ms`);

      expect(metrics.p95).toBeLessThan(30000);
      expect(metrics.avg).toBeLessThan(20000);
    }, 180000);

    it('should perform consistently across platforms', async () => {
      const platforms = ['instagram', 'facebook', 'line'] as const;
      const results: { platform: string; time: number }[] = [];

      for (const platform of platforms) {
        const start = Date.now();
        
        await request(app)
          .post('/api/v1/content/generate')
          .set('X-API-Key', validApiKey)
          .send({
            user_input: '測試平台效能',
            topic_templates: ['victim_rights'],
            platform_type: platform,
            selected_news_urls: []
          })
          .expect(200);
        
        const time = Date.now() - start;
        results.push({ platform, time });
      }

      console.log('Content Generation by Platform:');
      results.forEach(r => {
        console.log(`  ${r.platform}: ${r.time}ms`);
      });

      // All platforms should be under 30s
      results.forEach(r => {
        expect(r.time).toBeLessThan(30000);
      });

      // Variance should be reasonable (within 50% of average)
      const times = results.map(r => r.time);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avg)));
      expect(maxDeviation).toBeLessThan(avg * 0.5);
    }, 180000);
  });

  describe('Content Refinement Performance', () => {
    let generationId: string;

    beforeAll(async () => {
      // Generate content first
      const response = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({
          user_input: '測試內容',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: []
        });

      generationId = response.body.generation_id;
    }, 60000);

    it('should respond within 20s (p95)', async () => {
      const times: number[] = [];
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/v1/content/refine')
          .set('X-API-Key', validApiKey)
          .send({
            content_id: `${generationId}_${i}`,
            feedback: '請加強情感共鳴的部分'
          })
          .expect(200);
        times.push(Date.now() - start);
      }

      const metrics = calculateMetrics(times);

      console.log('Content Refinement Performance:');
      console.log(`  Min: ${metrics.min}ms`);
      console.log(`  Max: ${metrics.max}ms`);
      console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`);
      console.log(`  P50: ${metrics.p50}ms`);
      console.log(`  P95: ${metrics.p95}ms`);
      console.log(`  P99: ${metrics.p99}ms`);

      expect(metrics.p95).toBeLessThan(20000);
      expect(metrics.avg).toBeLessThan(15000);
    }, 120000);
  });

  describe('Throughput Tests', () => {
    it('should handle 10 concurrent requests', async () => {
      const concurrentRequests = 10;
      const start = Date.now();

      const promises = Array(concurrentRequests)
        .fill(null)
        .map((_, i) =>
          request(app)
            .post('/api/v1/news/search')
            .set('X-API-Key', validApiKey)
            .send({ keywords: [`test${i}`] })
            .expect(200)
        );

      await Promise.all(promises);

      const totalTime = Date.now() - start;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log(`Concurrent News Search (${concurrentRequests} requests):`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Avg per Request: ${avgTimePerRequest.toFixed(2)}ms`);

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(60000); // 60s for 10 concurrent requests
    }, 120000);

    it('should maintain performance under sustained load', async () => {
      const requestsPerBatch = 5;
      const batches = 3;
      const batchTimes: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const start = Date.now();

        const promises = Array(requestsPerBatch)
          .fill(null)
          .map(() =>
            request(app)
              .get('/api/v1/templates')
              .set('X-API-Key', validApiKey)
              .expect(200)
          );

        await Promise.all(promises);
        batchTimes.push(Date.now() - start);
      }

      console.log('Sustained Load Test:');
      batchTimes.forEach((time, i) => {
        console.log(`  Batch ${i + 1}: ${time}ms`);
      });

      // Performance should not degrade significantly
      const firstBatch = batchTimes[0];
      const lastBatch = batchTimes[batchTimes.length - 1];
      const degradation = (lastBatch - firstBatch) / firstBatch;

      console.log(`  Performance Degradation: ${(degradation * 100).toFixed(1)}%`);

      expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
    }, 120000);
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated requests', async () => {
      const iterations = 50;
      const memorySnapshots: number[] = [];

      // Take initial snapshot
      if (global.gc) {
        global.gc();
      }
      memorySnapshots.push(process.memoryUsage().heapUsed);

      // Make requests
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/api/v1/templates')
          .set('X-API-Key', validApiKey)
          .expect(200);

        // Take snapshot every 10 requests
        if (i % 10 === 0) {
          if (global.gc) {
            global.gc();
          }
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      console.log('Memory Usage:');
      memorySnapshots.forEach((mem, i) => {
        console.log(`  Snapshot ${i}: ${(mem / 1024 / 1024).toFixed(2)} MB`);
      });

      // Memory should not grow unbounded
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const growth = (finalMemory - initialMemory) / initialMemory;

      console.log(`  Memory Growth: ${(growth * 100).toFixed(1)}%`);

      // Allow some growth but not excessive
      expect(growth).toBeLessThan(2.0); // Less than 200% growth
    }, 120000);
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // This test would compare against stored baselines
      // For now, we just verify current performance

      const endpoints = [
        { name: 'Health Check', path: '/health', method: 'GET', threshold: 50 },
        { name: 'Templates', path: '/api/v1/templates', method: 'GET', threshold: 500 }
      ];

      for (const endpoint of endpoints) {
        const times: number[] = [];
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          
          if (endpoint.method === 'GET') {
            await request(app)
              .get(endpoint.path)
              .set('X-API-Key', validApiKey)
              .expect(200);
          }
          
          times.push(Date.now() - start);
        }

        const metrics = calculateMetrics(times);

        console.log(`${endpoint.name} Performance:`);
        console.log(`  P95: ${metrics.p95}ms (threshold: ${endpoint.threshold}ms)`);

        expect(metrics.p95).toBeLessThan(endpoint.threshold);
      }
    }, 60000);
  });
});
