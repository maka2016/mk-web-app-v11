import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, areas } from '@/i18n/config';

export function proxy(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || '';
  const isMobile =
    /Mobile|Android|iP(hone|od|ad)|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );
  const isWechat = /MicroMessenger/i.test(userAgent);
  const isDouyin = /aweme/gi.test(userAgent);
  const searchParams = req.nextUrl.searchParams;
  const appid = searchParams.get('appid');
  const res = NextResponse.next();
  res.headers.set('x-device-type', isMobile ? 'mobile' : 'desktop');
  res.headers.set('x-is-douyin', isDouyin ? 'true' : 'false');
  res.headers.set('x-is-wechat', isWechat ? 'true' : 'false');
  res.headers.set('x-pathname', req.nextUrl.pathname);

  const langParam = searchParams.get('lang'); // 获取查询参数 lang
  // is_overseas: 0 国内 1 海外
  const areaParam = searchParams.get('is_overseas'); // 获取查询参数 area

  const response = NextResponse.next();

  // 如果参数有效且支持该语言，则设置到 Cookie
  if (langParam && locales.includes(langParam)) {
    response.cookies.set('NEXT_LOCALE', langParam, {
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (appid) {
    response.cookies.set('NEXT_APPID', appid, {
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (areaParam) {
    response.cookies.set('IS_OVERSEAS', areaParam, {
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
