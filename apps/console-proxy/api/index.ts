/**
 * Vercel Edge Function: Catch-all proxy
 */

export const config = {
  runtime: 'edge',
  path: '/api/*',
};

const BACKEND_URL = 'https://conservation-vital-membrane-ssl.trycloudflare.com';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}${url.pathname}${url.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });
    
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
    return new Response(JSON.stringify({
      success: false,
      error: 'Backend unavailable',
      code: 'PROXY_ERROR',
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
