import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import foodRoutes from './routes/food.routes.js';
import couponRoutes from './routes/coupons.routes.js';
import aiRoutes from './routes/ai.routes.js';
import linkRoutes from './routes/link.routes.js';
import brandRoutes from './routes/brand.routes.js';
import databaseRoutes from './routes/database.routes.js';
import { isSupabaseConfigured, supabaseConfig } from './config/supabase.js';
import { createCorsMiddleware } from './config/cors.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { validateProductionProvenanceConfiguration } from './security/provenanceVerifier.js';

dotenv.config();

// Production Security Gate: Refuse to start if required security configuration is missing
validateProductionProvenanceConfiguration();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Security Middleware: Restrict CORS to explicitly configured & localhost dev origins
app.use(createCorsMiddleware());
app.use(express.json());

// Request logging for developer visibility
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'FoodWise AI Backend',
    timestamp: new Date().toISOString(),
    supportedPlatforms: ['Zomato', 'Swiggy', 'Toing'],
    currencyModel: 'Integer Paise (100 Paise = ₹1.00)',
    missingFeesPolicy: 'Explicit null (Unknown), never misrepresented as 0',
    database: {
      isConfigured: isSupabaseConfigured(),
      isAdminConfigured: supabaseConfig.isAdminConfigured,
      mode: supabaseConfig.mode,
      url: supabaseConfig.url ? `${supabaseConfig.url.slice(0, 20)}...` : 'Not configured',
    },
  });
});

// API Routes
app.use('/api/foods', foodRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/compare-link', linkRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/database', databaseRoutes);

// Serve frontend static build if available (production full-stack deployment)
const frontendDist = path.resolve(process.cwd(), 'frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Handler for undefined API endpoints
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Global Express Error-Handling Middleware (Must be registered last)
app.use(globalErrorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  🍲 FoodWise AI Backend Server Running!      `);
  console.log(`  🚀 Port: http://localhost:${PORT}             `);
  console.log(`  📋 Health: http://localhost:${PORT}/api/health`);
  console.log(`  🗄️ Database: http://localhost:${PORT}/api/database/health`);
  console.log(`===============================================`);
});
