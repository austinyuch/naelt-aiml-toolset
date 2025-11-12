import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { ContentOrchestrator } from '../services/ContentOrchestrator.js';
import { healthRouter } from './routes/health.js';
import { newsRouter } from './routes/news.js';
import { contentRouter } from './routes/content.js';
import { templatesRouter } from './routes/templates.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { monitoringMiddleware } from './middleware/monitoring.js';

/**
 * Swagger/OpenAPI configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '司法正義論述生成器 API',
      version: '1.0.0',
      description: 'API for generating advocacy content for judicial justice topics',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: ['./src/api/routes/*.ts'] // Path to API route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Create Express application
 * 
 * Requirements:
 * - 1.1: Provide OpenAPI 3.0 specification document
 * - 10.3: Provide health check endpoint
 * 
 * @param orchestrator - Content orchestrator instance
 * @returns Configured Express application
 */
export function createExpressApp(orchestrator: ContentOrchestrator): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Monitoring middleware (applied to all routes)
  app.use(monitoringMiddleware);

  // OpenAPI documentation (public, no auth required)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/openapi.json', (req, res) => {
    res.json(swaggerSpec);
  });

  // Health check endpoint (public, no auth required)
  app.use(healthRouter);

  // Protected API routes (require authentication)
  app.use('/api/v1/news', authMiddleware, newsRouter(orchestrator));
  app.use('/api/v1/content', authMiddleware, contentRouter(orchestrator));
  app.use('/api/v1/templates', authMiddleware, templatesRouter(orchestrator));

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
