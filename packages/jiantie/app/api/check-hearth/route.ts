import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint
 * @param request - The incoming request
 * @returns A simple "ok" response to indicate the service is running
 */
export async function GET(request: NextRequest) {
  return new NextResponse('ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
