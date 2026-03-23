/**
 * Next.js API Proxy: Incident Detail
 * 
 * Stage 6: Auth-protected workspace proxy route
 */

import { NextRequest, NextResponse } from 'next/server';
import { incidents } from '@/lib/vienna-runtime-client';
import { requireWorkspaceAccess } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Enforce authentication
  const authResult = requireWorkspaceAccess(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401/403 response
  }
  
  try {
    const data = await incidents.get(params.id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: 'runtime_error', message },
      { status }
    );
  }
}
