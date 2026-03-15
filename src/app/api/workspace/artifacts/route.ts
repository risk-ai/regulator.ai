/**
 * Next.js API Proxy: Artifacts List
 */

import { NextResponse } from 'next/server';
import { artifacts } from '@/lib/vienna-runtime-client';

export async function GET() {
  try {
    const data = await artifacts.list();
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
