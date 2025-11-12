/**
 * TemplateManagementService Unit Tests
 * 
 * Tests for template management service
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { TemplateManagementService } from '../../../src/services/TemplateManagementService.js';
import { TopicTemplate } from '../../../src/types/domain.js';

describe('TemplateManagementService', () => {
  let service: TemplateManagementService;

  beforeEach(() => {
    service = new TemplateManagementService();
  });

  describe('getTemplates', () => {
    it('should return all available templates', async () => {
      // Requirement 5.1: Return template list within 500ms
      const startTime = Date.now();
      const templates = await service.getTemplates();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should include all required fields in templates', () => {
      // Requirement 5.2: Include template_id, name, description, and tone_guidelines
      const templates = service.getTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('template_id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('tone_guidelines');
        expect(template).toHaveProperty('example_output');
      });
    });

    it('should provide templates for all required topics', () => {
      // Requirement 5.3: Provide templates for victim_rights, anti_death_penalty, and judicial_injustice
      const templates = service.getTemplates();
      const templateIds = templates.map(t => t.template_id);

      expect(templateIds).toContain('victim_rights');
      expect(templateIds).toContain('anti_death_penalty');
      expect(templateIds).toContain('judicial_injustice');
    });

    it('should support Chinese language by default', () => {
      // Requirement 5.5: Support zh_TW language
      const templates = service.getTemplates();

      templates.forEach(template => {
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        // Default language should be Chinese
        expect(template.name).toMatch(/[\u4e00-\u9fa5]/); // Contains Chinese characters
      });
    });

    it('should support English language', () => {
      // Requirement 5.5: Support en language
      const templates = service.getTemplates('en');

      templates.forEach(template => {
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        // English names should not contain Chinese characters
        expect(template.name).not.toMatch(/[\u4e00-\u9fa5]/);
      });
    });

    it('should include example output for each template', () => {
      // Requirement 5.4: Include example_output field
      const templates = service.getTemplates();

      templates.forEach(template => {
        expect(template.example_output).toBeTruthy();
        expect(template.example_output.length).toBeGreaterThan(0);
      });
    });

    it('should return same templates for multiple calls', () => {
      const templates1 = service.getTemplates();
      const templates2 = service.getTemplates();

      expect(templates1).toEqual(templates2);
    });
  });

  describe('getTemplateById', () => {
    it('should return template by ID', () => {
      const template = service.getTemplateById('victim_rights');

      expect(template).toBeDefined();
      expect(template.template_id).toBe('victim_rights');
    });

    it('should return victim_rights template', () => {
      const template = service.getTemplateById('victim_rights');

      expect(template.template_id).toBe('victim_rights');
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
    });

    it('should return anti_death_penalty template', () => {
      const template = service.getTemplateById('anti_death_penalty');

      expect(template.template_id).toBe('anti_death_penalty');
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
    });

    it('should return judicial_injustice template', () => {
      const template = service.getTemplateById('judicial_injustice');

      expect(template.template_id).toBe('judicial_injustice');
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
    });

    it('should throw error for invalid template ID', () => {
      expect(() => {
        service.getTemplateById('invalid_template');
      }).toThrow('Template not found');
    });

    it('should support language parameter', () => {
      const templateZh = service.getTemplateById('victim_rights', 'zh_TW');
      const templateEn = service.getTemplateById('victim_rights', 'en');

      expect(templateZh.name).toMatch(/[\u4e00-\u9fa5]/); // Chinese
      expect(templateEn.name).not.toMatch(/[\u4e00-\u9fa5]/); // English
    });
  });

  describe('template content', () => {
    it('should have distinct tone guidelines for each template', () => {
      const templates = service.getTemplates();

      const toneGuidelines = templates.map(t => t.tone_guidelines);
      const uniqueGuidelines = new Set(toneGuidelines);

      // Each template should have unique tone guidelines
      expect(uniqueGuidelines.size).toBe(templates.length);
    });

    it('should have meaningful descriptions', () => {
      const templates = service.getTemplates();

      templates.forEach(template => {
        expect(template.description.length).toBeGreaterThan(20);
      });
    });

    it('should have example outputs that demonstrate the template', () => {
      const templates = service.getTemplates();

      templates.forEach(template => {
        expect(template.example_output.length).toBeGreaterThan(50);
      });
    });
  });
});
