import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { AppError } from './utils/AppError';
import { sendSuccess } from './utils/apiResponse';

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Root route
app.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, {
    name: 'TaskFlow API',
    version: '1.0.0',
    status: 'running',
    healthCheck: '/api/health',
  }, 'Welcome to TaskFlow API');
});

// API Routes
app.use('/api', routes);

// 404 Route Handler
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
