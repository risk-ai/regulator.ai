/**
 * Next.js API Proxy: Incidents List
 */

import { NextResponse } from 'next/server';
import { incidents } from '@/lib/vienna-runtime-client';

export async function GET() {
  try {
    const data = await incidents.list();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'runtime_error', message: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await incidents.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'runtime_error', message: error.message },
      { status: error.status || 500 }
    );
  }
}
