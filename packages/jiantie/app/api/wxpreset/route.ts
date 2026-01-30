import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = ['openId', 'unionId', 'thumb', 'nickname', 'token', 'uid'];
  const cookieStore = await cookies();

  for (const param of params) {
    const value = searchParams.get(param);
    if (value) {
      let decodedValue = value;
      if (param === 'thumb' || param === 'nickname') {
        decodedValue = decodeURIComponent(value);
      }
      cookieStore.set(param, decodedValue, {
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: false,
        path: '/',
      });
    }
  }

  const redirectUrl = searchParams.get('url');
  if (redirectUrl) {
    cookieStore.set('redirect_url', redirectUrl, {
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      path: '/',
    });
  }

  return NextResponse.redirect(redirectUrl || '/', 301);
}
