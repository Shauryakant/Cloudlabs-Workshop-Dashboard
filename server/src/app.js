import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

// Production Static Asset Serving (Serves frontend when client/dist exists)
const distPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  console.log(`[Server] Serving production frontend from: ${distPath}`);
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn(`[Server] Frontend build directory not found at: ${distPath}`);
}

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
