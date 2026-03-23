/**
 * Vienna Runtime - Minimal Health Check Service
 * Temporary deployment to verify Fly.io + Vercel integration
 */

const express = require('express');
const app = express();

const PORT = parseInt(process.env.PORT || '3100', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vienna-runtime',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Catch-all
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'Vienna Runtime is operational but this endpoint is not yet implemented'
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Vienna Runtime listening on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});
