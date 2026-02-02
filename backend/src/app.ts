import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { routes } from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();

// Security headers - Enable globally
app.use(helmet());

// Handle Chrome DevTools internal request to avoid 404s
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
    res.json({ ok: true });
});

// Request logging
if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
}

// CORS configuration
const allowedHeaders = ['Content-Type', 'Authorization', 'x-workspace-id'];
if (config.nodeEnv === 'development') {
    allowedHeaders.push('x-mock-user-id', 'x-mock-workspace-id');
}

app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Global error handler
app.use(errorHandler);

export default app;
