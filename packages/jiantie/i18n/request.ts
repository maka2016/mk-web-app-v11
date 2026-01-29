import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale || 'zh-CN';

  // 将所有包含zh的语言环境映射到zh-CN
  const messageLocale = locale.includes('zh') ? 'zh-CN' : locale;

  return {
    locale,
    messages: (await import(`../messages/${messageLocale}.json`)).default,
  };
});
