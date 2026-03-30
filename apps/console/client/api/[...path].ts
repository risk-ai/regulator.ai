/**
 * Vercel Serverless Function: Backend Proxy
 * 
 * Proxies all API requests to the NUC backend via named Cloudflare Tunnel.
 * This provides a stable URL even when the tunnel endpoint changes.
 */

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

// Named tunnel - stable across restarts
const TUNNEL_ID = '2aeefb18-ab8c-4580-a23f-8cdaa0425484';
const BACKEND_URL = `https://${TUNNEL_ID}.cfargotunnel.com`;

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // Extract path after /api/
  const apiPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `${BACKEND_URL}/api${apiPath}${url.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? await req.text() 
        : undefined,
    });
    
    // Forward response with CORS
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('[Proxy] Backend unavailable:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Backend temporarily unavailable',
      code: 'BACKEND_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
