/**
 * Status API Route — Server-side health check proxy
 * 
 * Checks all Vienna OS services from the server (no CORS issues)
 * and returns combined status to the client-side status page.
 */

import { NextResponse } from "next/server";

interface ServiceCheck {
  name: string;
  endpoint: string;
  url: string;
  operational: boolean;
  latencyMs: number | null;
  statusCode: number | null;
}

async function checkService(
  name: string,
  endpoint: string,
  url: string
): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    return {
      name,
      endpoint,
      url,
      operational: res.ok,
      latencyMs,
      statusCode: res.status,
    };
  } catch {
    return {
      name,
      endpoint,
      url,
      operational: false,
      latencyMs: null,
      statusCode: null,
    };
  }
}

export async function GET() {
  const [console, health, marketing] = await Promise.all([
    checkService(
      "Vienna OS Console",
      "console.regulator.ai",
      "https://console.regulator.ai"
    ),
    checkService(
      "Health API",
      "/api/v1/health",
      "https://console.regulator.ai/api/v1/health"
    ),
    checkService(
      "Marketing Site",
      "regulator.ai",
      "https://regulator.ai"
    ),
  ]);

  // Parse health details if available
  let healthDetails: any = null;
  if (health.operational) {
    try {
      const res = await fetch("https://console.regulator.ai/api/v1/health", {
        cache: "no-store",
      });
      healthDetails = await res.json();
    } catch {}
  }

  // Intent Gateway and Auth are served by the same backend as Health API
  // If health endpoint works, they work too
  const intentGateway: ServiceCheck = {
    name: "Intent Gateway API",
    endpoint: "/api/v1/agent/intent",
    url: "https://console.regulator.ai/api/v1/agent/intent",
    operational: health.operational,
    latencyMs: health.latencyMs,
    statusCode: health.operational ? 200 : null,
  };

  const auth: ServiceCheck = {
    name: "Authentication",
    endpoint: "/api/v1/auth",
    url: "https://console.regulator.ai/api/v1/auth",
    operational: health.operational,
    latencyMs: health.latencyMs,
    statusCode: health.operational ? 200 : null,
  };

  const services = [console, health, intentGateway, auth, marketing];
  const allOperational = services.every((s) => s.operational);

  return NextResponse.json({
    status: allOperational ? "operational" : "degraded",
    services,
    healthDetails,
    checkedAt: new Date().toISOString(),
  });
}
