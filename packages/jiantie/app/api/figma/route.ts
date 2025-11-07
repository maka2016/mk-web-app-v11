import { NextRequest, NextResponse } from 'next/server';

/**
 * Figma API 代理
 * 解决前端直接调用 Figma API 的 CORS 问题
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    const token = request.headers.get('x-figma-token');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Missing Figma access token' },
        { status: 401 }
      );
    }

    const url = `${FIGMA_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Figma API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Figma API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
