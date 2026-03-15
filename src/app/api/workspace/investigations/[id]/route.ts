/**
 * Next.js API Proxy: Investigation Detail
 */

import { NextResponse } from 'next/server';
import { investigations } from '@/lib/vienna-runtime-client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await investigations.get(params.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'runtime_error', message: error.message },
      { status: error.status || 500 }
    );
  }
}
