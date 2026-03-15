/**
 * Next.js API Proxy: Incident Detail
 */

import { NextResponse } from 'next/server';
import { incidents } from '@/lib/vienna-runtime-client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
