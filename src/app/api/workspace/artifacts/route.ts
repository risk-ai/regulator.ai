/**
 * Next.js API Proxy: Artifacts List
 */

import { NextResponse } from 'next/server';
import { artifacts } from '@/lib/vienna-runtime-client';

export async function GET() {
  try {
    const data = await artifacts.list();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'runtime_error', message: error.message },
      { status: error.status || 500 }
    );
  }
}
