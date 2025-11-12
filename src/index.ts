/**
 * Advocacy Content Generator - Main Entry Point
 * 
 * This is the main entry point for the application.
 * It supports three service modes:
 * - unified: Both REST API and MCP server
 * - api-only: REST API only
 * - mcp-only: MCP server only
 */

import { config } from './config.js';

async function main(): Promise<void> {
  console.log('Starting Advocacy Content Generator...');
  console.log(`Service Mode: ${config.serviceMode}`);
  console.log(`Port: ${config.port}`);
  console.log(`AWS Region: ${config.awsRegion}`);
  console.log(`Log Level: ${config.logLevel}`);

  // TODO: Initialize services based on service mode
  // This will be implemented in subsequent tasks

  console.log('Application started successfully');
}

// Graceful shutdown handler
function gracefulShutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down gracefully...`);
  process.exit(0);
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start application
main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
