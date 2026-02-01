/**
 * Express Middleware Configuration
 * 
 * CORS, Helmet, Compression, and other security middleware
 */

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Configure CORS middleware
 */
export const corsMiddleware = cors({
  origin: [frontendUrl, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

/**
 * Configure Helmet for security headers
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * Configure compression middleware
 */
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
});

/**
 * JSON body parser with size limit
 */
export const jsonMiddleware = express.json({ limit: '10mb' });

/**
 * URL-encoded body parser
 */
export const urlencodedMiddleware = express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
});
