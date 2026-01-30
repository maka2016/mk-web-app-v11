import '@/styles/index.css';
import { cookies, headers } from 'next/headers';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
// import { Metadata, Viewport } from "next";
import { EnvironmentProvider } from '@/components/EnvironmentProvider';
import { TRPCProvider } from '@/components/TRPCProvider';
import { UrlParamCleaner } from '@/components/UrlParamCleaner';
import { ModalsProviderWithGlobal } from '@workspace/ui/components/ShowDrawerV2';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';

const title: any = {
  jiantie: '简帖',
  xueji: '拼好课',
  huiyao: '会邀',
  // maka: 'MAKA',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const head = await headers();
  const cookieStore = await cookies();
  const cookieAppId = cookieStore.get('NEXT_APPID')?.value;
  const appid = cookieAppId || process.env.APP_ID || 'jiantie';
  const isWechat = head.get('x-is-wechat') === 'true';

  // const ua = headers['user-agent'] || ''
  //   return /MicroMessenger/i.test(ua)

  const UA = head.get('user-agent') ?? '';
  const isWechatBrowser = /MicroMessenger/i.test(UA);

  const locale = await getLocale();

  return (
    <html className={appid} lang={locale}>
      <NextIntlClientProvider>
        <head>
          <link
            rel='icon'
            type='image/ico'
            href={`https://img2.maka.im/cdn/webstore10/${appid}/favicon.ico`}
          ></link>
          <title>{title[appid]}</title>
        </head>
        <body>
          <TRPCProvider>
            <ModalsProviderWithGlobal>
              <EnvironmentProvider userAgent={UA}>
                <UrlParamCleaner />
                <Script src='https://lf1-cdn-tos.bytegoofy.com/obj/iconpark/icons_36068_385.42878de689ce7ec6e35e3a7428cbe279.js'></Script>
                {children}
                <Toaster
                  containerStyle={{ top: 56, bottom: 88, zIndex: 99999 }}
                />
                {(isWechat || isWechatBrowser) && (
                  <Script src='https://res.maka.im/cdn/mk-widgets/sdk/jweixin-1.6.0.js'></Script>
                )}
              </EnvironmentProvider>
            </ModalsProviderWithGlobal>
          </TRPCProvider>
        </body>
      </NextIntlClientProvider>
    </html>
  );
}

// export const metadata = {
//   generateViewport: false,
// };

// export async function generateViewport() {
//   return null;
// }

export async function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    minimumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  };
}
