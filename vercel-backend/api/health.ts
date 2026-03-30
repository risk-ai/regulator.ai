/**
 * Health check endpoint for Vercel deployment
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  return new Response(JSON.stringify({
    success: true,
    data: {
      runtime: {
        status: "healthy",
        uptime_seconds: Math.floor(Date.now() / 1000),
        platform: "vercel-edge"
      },
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
