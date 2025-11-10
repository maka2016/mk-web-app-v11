import EventNotFound from '@/components/EventNotFound';
import WebsiteApp from '@/components/viewer/components/website';
import { getViewerData } from '@/components/viewer/utils/getViewerData';
import { prisma } from '@workspace/database';
import cls from 'classnames';
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
  const isScreenshot = !!searchParamsRes.screenshot;

  // 获取模板数据
  const viewerData = await getViewerData({
    worksId: id,
    version: searchParamsRes.version,
    isTemplate: true, // 明确指定这是模板
  });

  if (!viewerData?.worksData?.canvasData) {
    return <EventNotFound />;
  }

  // 构造兼容的 initProps 格式
  const initProps = {
    ...viewerData,
    userAgent: '',
    pathname: '',
    query: {
      worksId: id,
      uid: viewerData.worksDetail.uid.toString(),
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
    // 平铺 permissionData 字段
    removeProductIdentifiers: false,
    customLogo: false,
  };

  return (
    <div className={cls(['h-full flex flex-col overflow-hidden'])}>
      {!isScreenshot && <Header worksDetail={viewerData.worksDetail} id={id} />}
      <WebsiteApp key={id} {...initProps} />;
    </div>
  );
}
