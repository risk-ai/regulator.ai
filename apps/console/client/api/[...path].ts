/**
 * Vercel Edge Function: Backend Proxy
 * 
 * Proxies all API requests to the Vienna backend.
 * Backend URL is configurable via VIENNA_BACKEND_URL env var.
 * 
 * This eliminates hardcoded tunnel URLs that break on restart.
 */

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

export default async function handler(req: Request) {
  const backendUrl = process.env.VIENNA_BACKEND_URL;
  
  if (!backendUrl) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Backend URL not configured',
      code: 'BACKEND_NOT_CONFIGURED',
      hint: 'Set VIENNA_BACKEND_URL env var on the console-proxy Vercel project',
      timestamp: new Date().toISOString(),
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const apiPath = url.pathname;
  const targetUrl = `${backendUrl.replace(/\/$/, '')}${apiPath}${url.search}`;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://console.regulator.ai',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const headers: Record<string, string> = {};
    for (const [key, value] of req.headers.entries()) {
      // Forward relevant headers
      if (['content-type', 'cookie', 'authorization', 'x-request-id'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? await req.arrayBuffer()
        : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', 'https://console.regulator.ai');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('[Proxy] Backend unavailable:', error?.message || error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Backend temporarily unavailable',
      code: 'BACKEND_UNAVAILABLE',
      target: targetUrl,
      timestamp: new Date().toISOString(),
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
