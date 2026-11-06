import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { config } from './config/config.js';
import { logger } from './config/logger.js';
import { prisma, connectDatabase, disconnectDatabase } from './config/database.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routers
import authRouter from './modules/auth/auth.router.js';
import employeesRouter from './modules/employees/employees.router.js';
import dashboardRouter from './modules/dashboard/dashboard.router.js';
import auditRouter from './modules/audit/audit.router.js';

const PgSession = connectPgSimple(session);

// PostgreSQL pool for session store (separate from Prisma connection)
const sessionPool = new Pool({
  connectionString: config.DATABASE_URL,
});

export function createApp() {
  const app = express();

  // ─── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow loading resources for dev
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );

  // ─── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true, // Required for cookies
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );

  // ─── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Request context ───────────────────────────────────────────────────────
  app.use(requestContextMiddleware);

  // ─── Session store (PostgreSQL) ───────────────────────────────────────────
  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: false, // Managed by Prisma migration
      }),
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset expiry on each request
      cookie: {
        httpOnly: true,
        secure: config.SESSION_COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: config.SESSION_COOKIE_MAX_AGE_MS,
      },
    }),
  );

  // ─── Root & Health checks ─────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'Medical Store Management System API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
    });
  });

  const healthCheck = async (_req: express.Request, res: express.Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  };

  app.get('/health', healthCheck);
  app.get('/api/v1/health', healthCheck);

  // ─── API v1 routes ─────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/employees', employeesRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/audit', auditRouter);

  // ─── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist' },
    });
  });

  // ─── Error handler ─────────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

async function bootstrap() {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(config.API_PORT, config.API_HOST, () => {
      logger.info(
        { port: config.API_PORT, env: config.NODE_ENV },
        '🚀 Medical Store API started',
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down server...');
      server.close(async () => {
        await disconnectDatabase();
        await sessionPool.end();
        logger.info('Server shut down gracefully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Only bootstrap when this file is the entry point
if (require.main === module) {
  bootstrap();
}
