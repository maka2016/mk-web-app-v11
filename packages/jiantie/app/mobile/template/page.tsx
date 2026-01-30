import EventNotFound from '@/components/EventNotFound';
import WebsiteApp from '@/components/GridViewer/website';
import { getTemplateDataWithOSS } from '@/server';
import { prisma } from '@mk/jiantie/v11-database';
import cls from 'classnames';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import CreateBtn from './components/createBtn';
import Header from './components/header';

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{
    id: string;
  }>;
}) => {
  const id = (await searchParams).id;
  const templateDetail = await prisma.templateEntity.findUnique({
    where: { id },
  });

  if (!templateDetail) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale || 'zh-CN';
    const t = await getTranslations({ locale, namespace: 'Template' });
    return {
      title: t('模板不存在'),
    };
  }

  return {
    openGraph: {
      title: templateDetail.title,
      description: templateDetail.desc,
      images: [templateDetail.cover],
      url: `https://jiantieapp.com/mobile/template/${id}`,
      type: 'website',
    },
    title: templateDetail.title,
  };
};

export default async function Page({ searchParams }: any) {
  const searchParamsRes = await searchParams;
  const id = searchParamsRes.id;
  const isScreenshot = !!searchParamsRes.screenshot;

  // 获取模板数据

  const result = await getTemplateDataWithOSS({
    prisma,
    templateId: id,
  });


  if (!result?.work_data) {
    return <EventNotFound />;
  }

  // 构造兼容的 initProps 格式
  const initProps = {
    ...result,
    userAgent: '',
    pathname: '',
    query: {
      worksId: id,
      uid: result.detail.designer_uid?.toString() || '',
      version: searchParamsRes.version || '',
      host: '',
      screenshot: '',
      type: '',
      ...searchParamsRes,
    } as any,
    // 平铺 websiteControl 字段
    viewMode: 'viewer' as const,
    isExpire: false,
    trialExpired: false,
    floatAD: false,
    showWatermark: false,
    brandLogoUrl: undefined,
    brandText: undefined,
  };

  return (
    <div className={cls(['h-full flex flex-col overflow-hidden'])}>
      {!isScreenshot && <Header worksDetail={result.detail} id={id} />}
      <WebsiteApp
        key={id}
        worksData={result.work_data}
        worksDetail={result.detail as any}
        {...initProps}
      />
      {!isScreenshot && (
        <div className='p-4 bg-white border-t border-gray-200'>
          <CreateBtn
            templateDetail={result.detail}
            templateId={id}
            btnSize='lg'
          />
        </div>
      )}
    </div>
  );
}
