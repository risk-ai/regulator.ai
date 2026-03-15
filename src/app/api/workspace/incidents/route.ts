/**
 * Next.js API Proxy: Incidents List
 */

import { NextResponse } from 'next/server';
import { incidents } from '@/lib/vienna-runtime-client';

export async function GET() {
  try {
    const data = await incidents.list();
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await incidents.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: 'runtime_error', message },
      { status }
    );
  }
}
