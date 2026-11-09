import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import environmentRoutes from './routes/environmentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CloudLabs Workshop Operations API',
  });
});

// Mount API Routes
app.use('/api/environments', environmentRoutes);
app.use('/api/ai', aiRoutes);

// Production Static Asset Serving (Single-container / PaaS Deployment)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
