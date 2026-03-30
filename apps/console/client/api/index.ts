export const config = { runtime: 'edge', maxDuration: 30 };

export default async function handler(req: Request) {
  const backendUrl = process.env.VIENNA_BACKEND_URL || 'https://vienna-api.vercel.app';
  const url = new URL(req.url);
  const cleanSearch = Array.from(url.searchParams.entries())
    .filter(([key]) => !key.startsWith('...'))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const qs = cleanSearch ? `?${cleanSearch}` : '';
  const target = `${backendUrl}${url.pathname}${qs}`;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Max-Age': '86400',
    }});
  }

  try {
    const headers: Record<string, string> = {};
    for (const [k, v] of req.headers.entries()) {
      if (['content-type', 'cookie', 'authorization'].includes(k.toLowerCase())) headers[k] = v;
    }
    const resp = await fetch(target, {
      method: req.method, headers,
      body: !['GET','HEAD'].includes(req.method) ? await req.arrayBuffer() : undefined,
    });
    const rh = new Headers(resp.headers);
    rh.set('Access-Control-Allow-Origin', '*');
    return new Response(resp.body, { status: resp.status, headers: rh });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: 'Backend unavailable', target }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
}
// Cache bust Mon Mar 30 11:57:57 EDT 2026
