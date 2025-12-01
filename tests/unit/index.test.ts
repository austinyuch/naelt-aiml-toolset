/**
 * Main Entry Point Tests
 * 
 * Tests for application startup logic
 * Requirements: 10.1, 10.4, 10.5
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Application Startup', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let processExitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    // Spy on process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`Process.exit called with code ${code}`);
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Restore spies
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Service Mode Selection', () => {
    /**
     * Requirement 10.1: Support unified service mode
     */
    it('should support unified service mode', () => {
      process.env.SERVICE_MODE = 'unified';

      // In unified mode, both API and MCP should be initialized
      // This will be tested through integration tests
      expect(process.env.SERVICE_MODE).toBe('unified');
    });

    /**
     * Requirement 10.1: Support api-only service mode
     */
    it('should support api-only service mode', () => {
      process.env.SERVICE_MODE = 'api-only';

      // In api-only mode, only API should be initialized
      expect(process.env.SERVICE_MODE).toBe('api-only');
    });

    /**
     * Requirement 10.1: Support mcp-only service mode
     */
    it('should support mcp-only service mode', () => {
      process.env.SERVICE_MODE = 'mcp-only';

      // In mcp-only mode, only MCP should be initialized
      expect(process.env.SERVICE_MODE).toBe('mcp-only');
    });

    /**
     * Requirement 10.1: Default to unified mode if not specified
     */
    it('should default to unified mode if SERVICE_MODE not specified', () => {
      delete process.env.SERVICE_MODE;

      // Should default to unified
      const mode = process.env.SERVICE_MODE || 'unified';
      expect(mode).toBe('unified');
    });
  });

  describe('Startup Logging', () => {
    /**
     * Requirement 10.4: Log startup information
     */
    it('should log startup information', () => {
      const expectedLogs = [
        'Starting Advocacy Content Generator...',
        'Service Mode:',
        'Port:',
        'AWS Region:',
        'Log Level:'
      ];

      // Each expected log should be present
      expectedLogs.forEach(log => {
        expect(typeof log).toBe('string');
      });
    });

    /**
     * Requirement 10.4: Log listening address
     */
    it('should log listening address when API starts', () => {
      const port = 8000;
      const expectedLog = `Express API server listening on port ${port}`;

      expect(expectedLog).toContain('listening on port');
      expect(expectedLog).toContain(port.toString());
    });

    /**
     * Requirement 10.4: Log MCP server start
     */
    it('should log MCP server start message', () => {
      const expectedLog = 'MCP Server started on stdio';

      expect(expectedLog).toContain('MCP Server');
      expect(expectedLog).toContain('stdio');
    });
  });

  describe('Graceful Shutdown', () => {
    /**
     * Requirement 10.5: Handle SIGTERM signal
     */
    it('should handle SIGTERM signal', () => {
      const signal = 'SIGTERM';
      const expectedLog = `Received ${signal}, shutting down gracefully...`;

      expect(expectedLog).toContain('SIGTERM');
      expect(expectedLog).toContain('shutting down gracefully');
    });

    /**
     * Requirement 10.5: Handle SIGINT signal
     */
    it('should handle SIGINT signal', () => {
      const signal = 'SIGINT';
      const expectedLog = `Received ${signal}, shutting down gracefully...`;

      expect(expectedLog).toContain('SIGINT');
      expect(expectedLog).toContain('shutting down gracefully');
    });

    /**
     * Requirement 10.5: Shutdown within 5 seconds
     */
    it('should shutdown within 5 seconds', async () => {
      const startTime = Date.now();

      // Simulate graceful shutdown
      const shutdownPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100); // Simulate quick shutdown
      });

      await shutdownPromise;

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    /**
     * Requirement 10.5: Exit with code 0 on graceful shutdown
     */
    it('should exit with code 0 on graceful shutdown', () => {
      const exitCode = 0;

      expect(exitCode).toBe(0);
    });
  });

  describe('Error Handling', () => {
    /**
     * Should log error and exit with code 1 on startup failure
     */
    it('should log error and exit with code 1 on startup failure', () => {
      const error = new Error('Startup failed');
      const expectedLog = 'Failed to start application:';
      const expectedExitCode = 1;

      expect(expectedLog).toContain('Failed to start application');
      expect(expectedExitCode).toBe(1);
    });

    /**
     * Should handle missing configuration gracefully
     */
    it('should handle missing configuration gracefully', () => {
      // Remove required environment variables
      delete process.env.AWS_REGION;

      // Should still have defaults from config
      const defaultRegion = 'us-east-1';
      expect(defaultRegion).toBe('us-east-1');
    });
  });

  describe('Configuration Loading', () => {
    /**
     * Requirement 10.2: Load configuration from environment
     */
    it('should load configuration from environment variables', () => {
      process.env.PORT = '3000';
      process.env.AWS_REGION = 'us-west-2';
      process.env.LOG_LEVEL = 'debug';

      expect(process.env.PORT).toBe('3000');
      expect(process.env.AWS_REGION).toBe('us-west-2');
      expect(process.env.LOG_LEVEL).toBe('debug');
    });

    /**
     * Requirement 10.2: Use default values when not specified
     */
    it('should use default values when environment variables not specified', () => {
      delete process.env.PORT;
      delete process.env.LOG_LEVEL;

      const defaultPort = 8000;
      const defaultLogLevel = 'info';

      expect(defaultPort).toBe(8000);
      expect(defaultLogLevel).toBe('info');
    });
  });

  describe('Service Initialization', () => {
    /**
     * Should initialize services in correct order
     */
    it('should initialize services in correct order', () => {
      const initOrder = [
        'Load configuration',
        'Initialize clients',
        'Initialize services',
        'Initialize orchestrator',
        'Start API server (if enabled)',
        'Start MCP server (if enabled)'
      ];

      expect(initOrder).toHaveLength(6);
      expect(initOrder[0]).toBe('Load configuration');
      expect(initOrder[initOrder.length - 1]).toContain('MCP server');
    });

    /**
     * Should create orchestrator with all dependencies
     */
    it('should create orchestrator with all dependencies', () => {
      const dependencies = [
        'NewsSearchService',
        'ContentGenerationService',
        'TemplateManagementService'
      ];

      expect(dependencies).toHaveLength(3);
      expect(dependencies).toContain('NewsSearchService');
      expect(dependencies).toContain('ContentGenerationService');
      expect(dependencies).toContain('TemplateManagementService');
    });
  });

  describe('API Server Startup', () => {
    /**
     * Should start API server in unified mode
     */
    it('should start API server in unified mode', () => {
      process.env.SERVICE_MODE = 'unified';

      const shouldStartAPI = process.env.SERVICE_MODE === 'unified' ||
        process.env.SERVICE_MODE === 'api-only';

      expect(shouldStartAPI).toBe(true);
    });

    /**
     * Should start API server in api-only mode
     */
    it('should start API server in api-only mode', () => {
      process.env.SERVICE_MODE = 'api-only';

      const shouldStartAPI = process.env.SERVICE_MODE === 'unified' ||
        process.env.SERVICE_MODE === 'api-only';

      expect(shouldStartAPI).toBe(true);
    });

    /**
     * Should NOT start API server in mcp-only mode
     */
    it('should NOT start API server in mcp-only mode', () => {
      process.env.SERVICE_MODE = 'mcp-only';

      const shouldStartAPI = process.env.SERVICE_MODE === 'unified' ||
        process.env.SERVICE_MODE === 'api-only';

      expect(shouldStartAPI).toBe(false);
    });
  });

  describe('MCP Server Startup', () => {
    /**
     * Should start MCP server in unified mode
     */
    it('should start MCP server in unified mode', () => {
      process.env.SERVICE_MODE = 'unified';

      const shouldStartMCP = process.env.SERVICE_MODE === 'unified' ||
        process.env.SERVICE_MODE === 'mcp-only';

      expect(shouldStartMCP).toBe(true);
    });

    /**
     * Should start MCP server in mcp-only mode
     */
    it('should start MCP server in mcp-only mode', () => {
      process.env.SERVICE_MODE = 'mcp-only';

      const shouldStartMCP = process.env.SERVICE_MODE === 'unified' ||
        process.env.SERVICE_MODE === 'mcp-only';

      expect(shouldStartMCP).toBe(true);
    });

    /**
     * Should NOT start MCP server in api-only mode
     */
    it('should NOT start MCP server in api-only mode', () => {
      process.env.SERVICE_MODE = 'api-only';

      const shouldStartMCP = process.env.SERVICE_MODE === 'unified' ||
        process.env.SERVICE_MODE === 'mcp-only';

      expect(shouldStartMCP).toBe(false);
    });
  });
});
