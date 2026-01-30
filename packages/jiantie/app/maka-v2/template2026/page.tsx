import EventNotFound from '@/components/EventNotFound';
import WebsiteApp from '@/components/GridViewer/website';
import { getTemplateDataWithOSS } from '@/server';
import { prisma } from '@mk/jiantie/v11-database';
import cls from 'classnames';

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
    return {
      title: '模板不存在',
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
    <div
      className={cls([
        'h-full flex flex-col overflow-hidden md:flex-row md:max-w-[1200px] md:mx-auto md:pt-5 md:gap-6',
      ])}
    >
      <div
        className={cls(['flex-1 flex flex-col overflow-hidden md:w-[500px]'])}
      >
        <WebsiteApp
          key={id}
          worksData={result.work_data}
          worksDetail={result.detail as any}
          {...initProps}
        />
      </div>
      {/* 移动端：标题显示在WebsiteApp下方 */}
      {/* PC端：标题显示在右侧 */}
      <div
        className={cls([
          'p-4 md:p-0 md:flex-1 md:flex md:flex-col md:justify-start',
        ])}
      >
        <h1 className={cls(['text-xl font-bold mb-2 md:text-2xl md:mb-4'])}>
          {result.detail.title}
        </h1>
        {result.detail.desc && (
          <p className={cls(['text-sm text-gray-600 md:text-base'])}>
            {result.detail.desc}
          </p>
        )}
      </div>
    </div>
  );
}
