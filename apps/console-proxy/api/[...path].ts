/**
 * Vercel Serverless Function: API Proxy to NUC Backend
 * 
 * This is a temporary proxy until backend is fully migrated to Vercel.
 * Routes all requests to the NUC backend via Cloudflare Tunnel.
 */

export const config = {
  runtime: 'edge',
};

const BACKEND_URL = 'https://virginia-centres-willing-longest.trycloudflare.com';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // Extract the path after /api/
  const path = url.pathname.replace(/^\/api\//, '');
  
  // Construct target URL (backend expects /api/* paths)
  const targetUrl = `${BACKEND_URL}/api/${path}${url.search}`;
  
  try {
    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });
    
    // Forward response with CORS headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Backend unavailable',
      code: 'PROXY_ERROR',
      timestamp: new Date().toISOString(),
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
