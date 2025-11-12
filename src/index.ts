/**
 * Advocacy Content Generator - Main Entry Point
 * 
 * This is the main entry point for the application.
 * It supports three service modes:
 * - unified: Both REST API and MCP server
 * - api-only: REST API only
 * - mcp-only: MCP server only
 * 
 * Requirements: 10.1, 10.4, 10.5
 */

import { config } from './config.js';
import { createExpressApp } from './api/app.js';
import { MCPServer } from './mcp/server.js';
import { ContentOrchestrator } from './services/ContentOrchestrator.js';
import { NewsSearchService } from './services/NewsSearchService.js';
import { ContentGenerationService } from './services/ContentGenerationService.js';
import { TemplateManagementService } from './services/TemplateManagementService.js';
import { NewsAPIClient } from './clients/NewsAPIClient.js';
import { BedrockClient } from './clients/BedrockClient.js';
import { Server } from 'http';
import { log } from './core/logger.js';
import { startMemoryMonitoring } from './core/metrics.js';

// Global references for graceful shutdown
let httpServer: Server | null = null;
let mcpServer: MCPServer | null = null;
let memoryMonitoringInterval: NodeJS.Timeout | null = null;

/**
 * Main application entry point
 * 
 * Requirement 10.1: Start on localhost with configurable port
 * Requirement 10.4: Log startup information including listening address and loaded configuration
 * 
 * @returns Promise that resolves when application is started
 */
async function main(): Promise<void> {
  log.info('Starting Advocacy Content Generator...', {
    service_mode: config.serviceMode,
    port: config.port,
    aws_region: config.awsRegion,
    log_level: config.logLevel
  });

  try {
    // Start memory monitoring
    log.info('Starting memory monitoring...');
    memoryMonitoringInterval = startMemoryMonitoring(10000); // Update every 10 seconds

    // Step 1: Initialize external API clients
    log.info('Initializing API clients...');
    const newsApiClient = new NewsAPIClient(config.newsApiKey || '');
    const bedrockClient = new BedrockClient(config.awsRegion || 'us-east-1');

    // Step 2: Initialize services
    log.info('Initializing services...');
    
    // Import additional dependencies
    const { PromptBuilder } = await import('./prompts/PromptBuilder.js');
    const { PromptTemplateLoader } = await import('./prompts/PromptTemplateLoader.js');
    const { RateLimiter } = await import('./core/rateLimiter.js');
    const { CacheManager } = await import('./core/cache.js');
    
    // Initialize core utilities
    const cacheManager = new CacheManager(config.cacheDir);
    const promptLoader = new PromptTemplateLoader();
    const promptBuilder = new PromptBuilder(promptLoader);
    const rateLimiter = new RateLimiter();
    
    // Initialize services
    const templateService = new TemplateManagementService();
    const newsService = new NewsSearchService(newsApiClient, cacheManager);
    const contentService = new ContentGenerationService(
      bedrockClient,
      promptBuilder,
      rateLimiter
    );

    // Step 3: Initialize orchestrator
    log.info('Initializing content orchestrator...');
    const orchestrator = new ContentOrchestrator(
      newsService,
      contentService,
      templateService
    );

    // Step 4: Start services based on service mode
    const serviceMode = config.serviceMode;

    // Start Express API server (unified or api-only mode)
    if (serviceMode === 'unified' || serviceMode === 'api-only') {
      log.info('Starting Express API server...');
      const app = createExpressApp(orchestrator);
      const port = config.port;
      const host = config.host;

      httpServer = app.listen(port, host, () => {
        log.info(`Express API server listening on ${host}:${port}`, {
          host,
          port,
          docs_url: `http://${host}:${port}/api-docs`,
          health_url: `http://${host}:${port}/health`,
          metrics_url: `http://${host}:${port}/metrics`
        });
      });
    }

    // Start MCP server (unified or mcp-only mode)
    if (serviceMode === 'unified' || serviceMode === 'mcp-only') {
      log.info('Starting MCP Server...');
      mcpServer = new MCPServer(orchestrator);
      await mcpServer.start();
      log.info('MCP Server started on stdio');
    }

    log.info('Application started successfully');
  } catch (error) {
    log.error('Error during application startup', { error });
    throw error;
  }
}

/**
 * Graceful shutdown handler
 * 
 * Requirement 10.5: Support graceful shutdown handling SIGTERM and SIGINT signals within 5 seconds
 * 
 * @param signal - Signal name (SIGTERM or SIGINT)
 */
function gracefulShutdown(signal: string): void {
  log.info(`Received ${signal}, shutting down gracefully...`);

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    log.error('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 5000); // 5 seconds as per requirement 10.5

  // Perform graceful shutdown
  const shutdownPromises: Promise<void>[] = [];

  // Stop memory monitoring
  if (memoryMonitoringInterval) {
    clearInterval(memoryMonitoringInterval);
    log.info('Memory monitoring stopped');
  }

  // Close HTTP server if running
  if (httpServer) {
    shutdownPromises.push(
      new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => {
          if (err) {
            log.error('Error closing HTTP server', { error: err });
            reject(err);
          } else {
            log.info('HTTP server closed');
            resolve();
          }
        });
      })
    );
  }

  // Close MCP server if running
  // Note: MCP server doesn't have explicit close method in current implementation
  // but we can add cleanup logic here if needed in the future
  if (mcpServer) {
    log.info('MCP server cleanup (if needed)');
  }

  // Wait for all shutdown operations to complete
  Promise.all(shutdownPromises)
    .then(() => {
      clearTimeout(forceExitTimeout);
      log.info('Graceful shutdown completed');
      process.exit(0);
    })
    .catch((error) => {
      clearTimeout(forceExitTimeout);
      log.error('Error during graceful shutdown', { error });
      process.exit(1);
    });
}

// Register signal handlers
// Requirement 10.5: Handle SIGTERM and SIGINT signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start application
main().catch((error) => {
  log.error('Failed to start application', { error });
  process.exit(1);
});
