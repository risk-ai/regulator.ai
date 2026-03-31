/**
 * API Documentation - Swagger UI
 * Renders interactive API documentation at /api/v1/docs
 */

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load OpenAPI spec
const openapiPath = path.join(__dirname, '../../openapi.yaml');
const swaggerDocument = YAML.load(openapiPath);

// Swagger UI options
const options = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Vienna OS API Documentation',
};

module.exports = (req, res) => {
  // Serve Swagger UI HTML
  if (req.url === '/api/v1/docs' || req.url === '/api/v1/docs/') {
    const html = swaggerUi.generateHTML(swaggerDocument, options);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  // Serve OpenAPI spec as JSON
  if (req.url === '/api/v1/docs/openapi.json') {
    res.setHeader('Content-Type', 'application/json');
    return res.json(swaggerDocument);
  }

  // Default: show Swagger UI
  const html = swaggerUi.generateHTML(swaggerDocument, options);
  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
};
