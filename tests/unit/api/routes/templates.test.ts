import request from 'supertest';
import express, { Express } from 'express';
import { templatesRouter } from '../../../../src/api/routes/templates.js';
import { ContentOrchestrator } from '../../../../src/services/ContentOrchestrator.js';
import { NewsSearchService } from '../../../../src/services/NewsSearchService.js';
import { ContentGenerationService } from '../../../../src/services/ContentGenerationService.js';
import { TemplateManagementService } from '../../../../src/services/TemplateManagementService.js';
import { TopicTemplate } from '../../../../src/types/domain.js';

// Mock services
jest.mock('../../../../src/services/NewsSearchService.js');
jest.mock('../../../../src/services/ContentGenerationService.js');
jest.mock('../../../../src/services/TemplateManagementService.js');

describe('Templates Routes', () => {
  let app: Express;
  let mockOrchestrator: ContentOrchestrator;
  let mockTemplateService: jest.Mocked<TemplateManagementService>;

  const mockTemplates: TopicTemplate[] = [
    {
      template_id: 'victim_rights',
      name: '受害者權益',
      description: '關注受害者權益保護',
      tone_guidelines: '同理受害者處境',
      example_output: '範例輸出'
    },
    {
      template_id: 'anti_death_penalty',
      name: '反廢死',
      description: '反對廢除死刑',
      tone_guidelines: '堅定立場',
      example_output: '範例輸出'
    },
    {
      template_id: 'judicial_injustice',
      name: '司法不公',
      description: '揭露司法體系中的不公平現象',
      tone_guidelines: '客觀分析',
      example_output: '範例輸出'
    }
  ];

  beforeEach(() => {
    // Create mock services
    const mockNewsService = {} as any;
    const mockContentService = {} as any;
    
    mockTemplateService = {
      getTemplates: jest.fn().mockReturnValue(mockTemplates),
      getTemplateById: jest.fn().mockImplementation((id: string) => {
        const template = mockTemplates.find(t => t.template_id === id);
        if (!template) {
          throw new Error(`Template not found: ${id}`);
        }
        return template;
      })
    } as any;

    mockOrchestrator = new ContentOrchestrator(
      mockNewsService,
      mockContentService,
      mockTemplateService
    );

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/templates', templatesRouter(mockOrchestrator));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/templates', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/api/v1/templates');

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await request(app).get('/api/v1/templates');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return array of templates', async () => {
      const response = await request(app).get('/api/v1/templates');

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return templates with required fields', async () => {
      const response = await request(app).get('/api/v1/templates');

      response.body.forEach((template: any) => {
        expect(template).toHaveProperty('template_id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('tone_guidelines');
        expect(template).toHaveProperty('example_output');
      });
    });

    it('should return 3 templates', async () => {
      const response = await request(app).get('/api/v1/templates');

      expect(response.body).toHaveLength(3);
    });

    it('should include victim_rights template', async () => {
      const response = await request(app).get('/api/v1/templates');

      const victimRights = response.body.find(
        (t: any) => t.template_id === 'victim_rights'
      );
      expect(victimRights).toBeDefined();
      expect(victimRights.name).toBe('受害者權益');
    });

    it('should include anti_death_penalty template', async () => {
      const response = await request(app).get('/api/v1/templates');

      const antiDeathPenalty = response.body.find(
        (t: any) => t.template_id === 'anti_death_penalty'
      );
      expect(antiDeathPenalty).toBeDefined();
      expect(antiDeathPenalty.name).toBe('反廢死');
    });

    it('should include judicial_injustice template', async () => {
      const response = await request(app).get('/api/v1/templates');

      const judicialInjustice = response.body.find(
        (t: any) => t.template_id === 'judicial_injustice'
      );
      expect(judicialInjustice).toBeDefined();
      expect(judicialInjustice.name).toBe('司法不公');
    });

    it('should support lang query parameter (zh_TW)', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .query({ lang: 'zh_TW' });

      expect(response.status).toBe(200);
      expect(mockTemplateService.getTemplates).toHaveBeenCalledWith('zh_TW');
    });

    it('should support lang query parameter (en)', async () => {
      const mockEnTemplates = mockTemplates.map(t => ({
        ...t,
        name: t.name + ' (EN)'
      }));
      mockTemplateService.getTemplates.mockReturnValue(mockEnTemplates);

      const response = await request(app)
        .get('/api/v1/templates')
        .query({ lang: 'en' });

      expect(response.status).toBe(200);
      expect(mockTemplateService.getTemplates).toHaveBeenCalledWith('en');
    });

    it('should default to zh_TW when lang not specified', async () => {
      await request(app).get('/api/v1/templates');

      expect(mockTemplateService.getTemplates).toHaveBeenCalledWith('zh_TW');
    });

    it('should respond within 500ms (performance requirement)', async () => {
      const startTime = Date.now();
      
      await request(app).get('/api/v1/templates');
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(500);
    });

    it('should handle service errors gracefully', async () => {
      mockTemplateService.getTemplates.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app).get('/api/v1/templates');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should return 200 status code for valid template ID', async () => {
      const response = await request(app).get('/api/v1/templates/victim_rights');

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await request(app).get('/api/v1/templates/victim_rights');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return template with required fields', async () => {
      const response = await request(app).get('/api/v1/templates/victim_rights');

      expect(response.body).toHaveProperty('template_id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('tone_guidelines');
      expect(response.body).toHaveProperty('example_output');
    });

    it('should return correct template by ID', async () => {
      const response = await request(app).get('/api/v1/templates/victim_rights');

      expect(response.body.template_id).toBe('victim_rights');
      expect(response.body.name).toBe('受害者權益');
    });

    it('should return 404 for non-existent template', async () => {
      mockTemplateService.getTemplateById.mockImplementation(() => {
        throw new Error('Template not found: invalid_id');
      });

      const response = await request(app).get('/api/v1/templates/invalid_id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should support lang query parameter', async () => {
      await request(app)
        .get('/api/v1/templates/victim_rights')
        .query({ lang: 'en' });

      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith(
        'victim_rights',
        'en'
      );
    });

    it('should handle service errors gracefully', async () => {
      mockTemplateService.getTemplateById.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app).get('/api/v1/templates/victim_rights');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
