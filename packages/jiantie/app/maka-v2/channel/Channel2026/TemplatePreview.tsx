import WebsiteApp from '@/components/GridViewer/website';
import { Badge } from '@workspace/ui/components/badge';
import { Copy, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTracking } from '../../../../components/TrackingContext';
import { mkWebStoreLogger } from '../../../../services/logger';
import { trpc } from '../../../../utils';
import CreateBtn from '../../template2026/components/createBtn';
import { TemplateItem2026 } from './TemplateWaterfall';

export const TemplatePreview = ({
  selectedTemplate,
  onSuccess,
}: {
  selectedTemplate?: TemplateItem2026;
  onSuccess: () => void;
}) => {
  if (!selectedTemplate) {
    return 'loading';
  }
  // 骨架屏组件
  const renderSkeleton = () => {
    return (
      <div className='h-full flex flex-col overflow-hidden bg-white'>
        <div className='flex-1 flex flex-col overflow-hidden md:flex-row md:w-full md:max-w-6xl md:mx-auto'>
          {/* 左侧预览区域骨架 */}
          <div className='flex-1 overflow-hidden md:flex-1'>
            <div className='p-4 md:p-6 max-w-[375px] mx-auto'>
              {/* 图片骨架 - 海报预览样式 */}
              <div className='w-full aspect-[3/4] bg-gray-200 rounded-md mb-4 animate-pulse'></div>
              {/* 标题骨架 */}
              <div className='h-6 bg-gray-200 rounded mb-2 w-3/4 animate-pulse'></div>
              {/* 描述骨架 */}
              <div className='h-4 bg-gray-200 rounded w-2/3 animate-pulse'></div>
            </div>
          </div>
          {/* PC端右侧信息栏骨架 */}
          <div className='hidden md:flex md:flex-col md:w-80 md:flex-shrink-0 md:sticky md:top-0 md:h-full md:border-l md:border-[rgba(0,0,0,0.06)] md:bg-white md:overflow-y-auto'>
            <div className='p-6'>
              <div className='h-6 bg-gray-200 rounded mb-4 w-4/5 animate-pulse'></div>
              <div className='h-4 bg-gray-200 rounded w-3/4 mb-6 animate-pulse'></div>
              <div className='flex flex-col gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]'>
                <div className='h-10 bg-gray-200 rounded animate-pulse'></div>
                <div className='h-10 bg-gray-200 rounded animate-pulse'></div>
                <div className='h-12 bg-gray-200 rounded animate-pulse'></div>
              </div>
            </div>
          </div>
          {/* 移动端底部操作栏骨架 */}
          <div className='sticky bottom-0 flex items-center p-4 bg-white flex-shrink-0 border-t border-[rgba(0,0,0,0.06)] z-10 md:hidden'>
            <div className='flex items-center w-full gap-4'>
              <div className='w-11 h-11 bg-gray-200 rounded animate-pulse'></div>
              <div className='w-11 h-11 bg-gray-200 rounded animate-pulse'></div>
              <div className='flex-1 h-11 bg-gray-200 rounded animate-pulse'></div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const templateId = selectedTemplate.id;
  const [templateData, setTemplateData] = useState<any>(null);
  const trackMeta = useTracking();

  useEffect(() => {
    const getTemplateData = async () => {
      const result = await trpc.template.getTemplateData.query({
        id: templateId,
      });
      setTemplateData(result);
    };
    getTemplateData();

    mkWebStoreLogger.track_pageview({
      ...trackMeta,
      page_type: 'template_page',
      page_id: templateId,
    });
  }, [templateId, trackMeta]);

  if (!templateData) {
    return renderSkeleton();
  }

  return (
    <div className='w-full h-full flex flex-col overflow-hidden bg-white'>
      <div className='flex-1 flex flex-col overflow-hidden md:flex-row md:w-full md:max-w-6xl md:mx-auto'>
        {/* 左侧预览区域 */}
        <div className='flex-1 overflow-auto md:flex-1 flex justify-center'>
          <div className='w-full max-w-[375px] max-h-[667px] mx-auto mt-6 overflow-auto rounded-lg shadow-lg'>
            <WebsiteApp
              key={templateId}
              worksData={templateData.work_data}
              worksDetail={templateData.detail as any}
              query={{
                uid: templateData.detail.designer_uid?.toString() || '',
                worksId: templateId,
                version: '',
                host: '',
                screenshot: 'true',
                type: '',
              }}
              userAgent={''}
              pathname={''}
              viewMode='viewer'
              isExpire={false}
              trialExpired={false}
              floatAD={false}
            />
          </div>
        </div>
        {/* 信息栏 - 移动端底部，桌面端右侧 */}
        <div className='sticky bottom-0 flex flex-col bg-white flex-shrink-0 border-t border-[rgba(0,0,0,0.06)] z-10 md:sticky md:top-0 md:w-80 md:h-full md:border-l md:border-t-0 md:overflow-y-auto'>
          <div className='p-4 pb-2 md:p-6 md:pb-6'>
            {/* 标题 */}
            <h2 className='text-lg font-semibold text-gray-900 mb-2 line-clamp-1 md:text-xl md:mb-3 md:line-clamp-2'>
              {selectedTemplate.title || selectedTemplate.name}
            </h2>
            {/* 描述 */}
            {/* {selectedTemplate.desc && (
              <p className='text-sm text-gray-600 mb-3 line-clamp-2 md:mb-6 md:line-clamp-4'>
                {selectedTemplate.desc}
              </p>
            )} */}
            {/* 规格信息 */}
            {(templateData.specInfo || selectedTemplate.spec) && (
              <div className='flex gap-1 items-center'>
                {/* 规格名称 */}
                {templateData.specInfo?.display_name ||
                templateData.specInfo?.name ||
                selectedTemplate.spec?.id ? (
                  <Badge variant={'info'}>
                    {templateData.specInfo?.display_name ||
                      templateData.specInfo?.name ||
                      selectedTemplate.spec?.id}
                  </Badge>
                ) : null}
                <div className='flex items-center gap-1'>
                  <span className='text-xs text-gray-400'>
                    ID: {templateId}
                  </span>
                  <button
                    className='p-1 hover:bg-gray-100 rounded transition-colors'
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigator.clipboard.writeText(templateId);
                      // toast.success('ID已复制到剪贴板');
                    }}
                    title='复制ID'
                  >
                    <Copy className='w-3 h-3 text-gray-400' />
                  </button>
                  <button
                    className='p-1 hover:bg-gray-100 rounded transition-colors'
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(
                        `/maka-v2/template2026?id=${templateId}&appid=maka`,
                        '_blank'
                      );
                    }}
                    title='新窗口打开链接'
                  >
                    <ExternalLink className='w-3 h-3 text-gray-400' />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className='p-4 pt-0 md:p-6 md:pt-4 md:border-t md:border-[rgba(0,0,0,0.06)]'>
            <CreateBtn
              templateDetail={selectedTemplate}
              templateId={templateId}
              btnSize='lg'
              onSuccess={() => {
                onSuccess();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
