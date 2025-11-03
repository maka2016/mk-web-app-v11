import EventNotFound from '@/components/EventNotFound';
import { treeNodeCounter2 } from '@/utils/works';
import { getInitialPropsCommonAppRouter } from '@/components/viewer/utils/getInitialPropsCommon2';
import { prisma } from '@workspace/database';
import cls from 'classnames';
import Header from './components/header';
import Main from './components/main';

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

async function getWorksData(paramsRes: {
  worksId: string;
  uid: string;
  userAgent: string;
  pathname: string;
  host: string;
}) {
  if (!paramsRes.worksId) {
    return null;
  }

  const initData = await getInitialPropsCommonAppRouter({
    headers: {
      'user-agent': paramsRes.userAgent,
      host: paramsRes.host,
    },
    pathname: paramsRes.pathname,
    query: paramsRes,
    isTemplate: true,
  });

  return initData;
}

export default async function Page({ searchParams }: any) {
  const searchParamsRes = await searchParams;
  const id = searchParamsRes.id;
  const isScreenshot = !!searchParamsRes.screenshot;
  // const templateDetail = (await getTemplateDetail2(id)) as any;
  const queryRes = await searchParams;
  const initProps = await getWorksData({
    // uid: templateDetail.designerUid,
    worksId: id,
    ...queryRes,
  });

  if (!initProps || !initProps?.worksData.canvasData) {
    return <EventNotFound />;
  }

  const widgetRely = treeNodeCounter2(initProps?.worksData);

  return (
    <div className={cls(['h-full flex flex-col overflow-hidden'])}>
      {!isScreenshot && (
        <Header
          title={initProps.worksDetail?.title || '模板详情'}
          pre_works_id={searchParamsRes.pre_works_id}
          worksDetail={initProps.worksDetail}
          id={id}
        />
      )}
      <Main
        widgetRely={widgetRely}
        initProps={initProps}
        // useTools={false}
        useTools={!isScreenshot}
        useAutoScrollByDefault={!isScreenshot}
        templateId={id}
      />
    </div>
  );
}
