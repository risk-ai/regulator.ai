/**
 * Vercel Serverless Function: API Proxy
 * 
 * Proxies all /api/v1/* requests to the Vienna Console backend via Tailscale
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Backend URL (Tailscale IP + port)
const BACKEND_URL = 'http://100.120.116.10:3100';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  
  // Reconstruct the full path
  const apiPath = Array.isArray(path) ? path.join('/') : path || '';
  const targetUrl = `${BACKEND_URL}/api/v1/${apiPath}`;
  
  // Forward query parameters
  const url = new URL(targetUrl);
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== 'path' && value) {
      url.searchParams.append(key, Array.isArray(value) ? value[0] : value);
    }
  });
  
  try {
    // Forward the request to backend
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward auth cookies if any
        ...(req.headers.cookie && { 'Cookie': req.headers.cookie }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    // Forward response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Forward status code
    res.status(response.status);
    
    // Forward response body
    const data = await response.text();
    res.send(data);
    
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Backend connection failed',
      code: 'PROXY_ERROR',
    });
  }
}
