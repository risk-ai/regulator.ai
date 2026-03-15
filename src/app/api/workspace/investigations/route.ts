/**
 * Next.js API Proxy: Investigations List
 */

import { NextResponse } from 'next/server';
import { investigations } from '@/lib/vienna-runtime-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    const data = await investigations.list({ status, limit });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'runtime_error', message: error.message },
      { status: error.status || 500 }
    );
  }
}
