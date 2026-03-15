/**
 * Next.js API Proxy: Investigations List
 * 
 * Stage 6: Auth-protected workspace proxy route
 */

import { NextRequest, NextResponse } from 'next/server';
import { investigations } from '@/lib/vienna-runtime-client';
import { requireWorkspaceAccess } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  // Enforce authentication
  const authResult = requireWorkspaceAccess(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401/403 response
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    const data = await investigations.list({ status, limit });
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
