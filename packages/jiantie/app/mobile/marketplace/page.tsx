import EventNotFound from '@/components/EventNotFound';
import { getInitialPropsCommonAppRouter } from '@mk/viewer/utils/getInitialPropsCommon2';
import { Button } from '@workspace/ui/components/button';
import Link from 'next/link';
import CreateBtn from './components/createBtn';
import { DetailContent } from './components/DetailContent';
import Header from './components/header';

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{
    id: string;
  }>;
}) => {
  const id = (await searchParams).id;

  try {
    // 获取模板数据
    const initData = await getInitialPropsCommonAppRouter({
      headers: {
        'user-agent': '',
        host: '',
      },
      pathname: '/mobile/marketplace',
      query: { worksId: id },
    });

    const showcaseInfo = initData?.worksData?.templateShowcaseInfo;
    const title =
      showcaseInfo?.displayTitle || initData?.worksDetail?.title || '模板详情';
    const description =
      showcaseInfo?.displayDescription?.plainText ||
      initData?.worksDetail?.desc ||
      '';
    const coverImage =
      showcaseInfo?.enabled && showcaseInfo.previewImages.length > 0
        ? showcaseInfo.previewImages.find(img => img.isCover)?.url ||
          showcaseInfo.previewImages[0]?.url
        : initData?.worksDetail?.cover;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: coverImage ? [coverImage] : [],
        url: `https://jiantieapp.com/mobile/marketplace?id=${id}`,
        type: 'website',
      },
    };
  } catch {
    return {
      title: '模板详情',
      description: '',
    };
  }
};

async function getWorksData(paramsRes: {
  worksId: string;
  uid?: string;
  userAgent?: string;
  pathname: string;
  host?: string;
}) {
  if (!paramsRes.worksId) {
    return null;
  }

  const initData = await getInitialPropsCommonAppRouter({
    headers: {
      'user-agent': paramsRes.userAgent || '',
      host: paramsRes.host || '',
    },
    pathname: paramsRes.pathname,
    query: paramsRes,
  });

  return initData;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    id: string;
    screenshot?: string;
    pre_works_id?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const searchParamsRes = await searchParams;
  const id = searchParamsRes.id;
  const isScreenshot = !!searchParamsRes.screenshot;

  const queryRes = await searchParams;
  const initProps = await getWorksData({
    worksId: id,
    pathname: '/mobile/marketplace',
    ...queryRes,
  });

  if (!initProps || !initProps?.worksData?.canvasData) {
    return <EventNotFound />;
  }

  // 获取模板商城展示信息
  const showcaseInfo = initProps.worksData.templateShowcaseInfo;

  return (
    <div className='h-full flex flex-col overflow-hidden bg-white'>
      {!isScreenshot && (
        <Header
          title={'模版预览'}
          pre_works_id={searchParamsRes.pre_works_id}
          worksDetail={initProps.worksDetail}
          id={id}
        />
      )}

      {/* 上图下文布局 - 类似小红书 */}
      <div className='flex-1 overflow-hidden'>
        <DetailContent
          showcaseInfo={showcaseInfo}
          worksDetail={{
            title: initProps.worksDetail?.title,
            cover: initProps.worksDetail?.cover,
            created_at: initProps.worksDetail?.created_at,
            view_count: initProps.worksDetail?.view_count,
            designer_name: initProps.worksDetail?.designer_name,
            designer_uid: initProps.worksDetail?.uid,
          }}
        />
      </div>
      <div className='footer flex p-3 gap-3 border-t border-gray-200 bg-white'>
        <Button variant={'outline'} className='flex-1'>
          <Link href={`/mobile/template?id=${id}`}>预览效果</Link>
        </Button>
        <CreateBtn
          className='flex-1'
          templateDetail={initProps.worksDetail}
          templateId={id}
        />
      </div>
    </div>
  );
}
