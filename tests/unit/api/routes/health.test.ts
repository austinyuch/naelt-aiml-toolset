import request from 'supertest';
import express, { Express } from 'express';
import { healthRouter } from '../../../../src/api/routes/health';

describe('Health Check Endpoint', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(healthRouter);
  });

  describe('GET /health', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
    });

    it('should return JSON response with status field', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('status');
    });

    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body.status).toBe('healthy');
    });

    it('should return version field', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body).toHaveProperty('version');
      expect(typeof response.body.version).toBe('string');
    });

    it('should return service_mode field', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body).toHaveProperty('service_mode');
      expect(typeof response.body.service_mode).toBe('string');
    });

    it('should return timestamp field', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
      // Validate ISO 8601 format
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should respond within 50ms (performance requirement)', async () => {
      const startTime = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50);
    });

    it('should return consistent response structure', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body).toEqual({
        status: expect.any(String),
        version: expect.any(String),
        service_mode: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });
});
