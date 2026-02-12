'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { useTracking } from '@/components/TrackingContext';
import {
  API,
  cdnApi,
  createWork,
  getAppId,
  getEditorInfo,
  getPlatform,
  getTemplateDetail,
  getToken,
  getUid,
  request,
} from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isPc, queryToObj, random, safeCopy, setDocumentTitle } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import { cn } from '@workspace/ui/lib/utils';
import { Copy, ExternalLink } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { TemplateCardData } from '../channel/components/TemplateCard';

interface Props {
  id: string;
  hideHeader?: boolean;
  onClose?: () => void;
}

interface TemplateProps {
  id: string;
  title: string;
  specName: string;
  page_width: number;
  page_height: number;
  price: number;
  viewerUrl: string;
  pagePreviews: string[];
  type: string;
  editor_type: string;
  spec_id: number;
  category_id: number;
  store_category_alias: string;
  secondary_category_id: number;
  firstImg: string;
  thumb: string;
  store_category_id: number;
  collected: boolean;
  description: string;
}

const PAGA_SIZE = 30;

const tabs = [
  {
    icon: '',
    label: '模板预览',
    key: 'preview',
  },
  {
    icon: 'similar',
    label: '相似模板',
    key: 'similar',
  },
];

const TemplateDetail = (props: Props) => {
  const { id, hideHeader = false, onClose } = props;
  const router = useRouter();
  const store = useStore();
  const [templateId, setTemplateId] = useState(id);
  const [detail, setDetail] = useState<TemplateProps>();
  const [collected, setCollected] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [editLoading, setEditLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sharePopup, setSharePopup] = useState(false);
  const [pageInstId] = useState(`template_page_${random(25).toUpperCase()}`);
  const urlSearchParams = useSearchParams();
  const [windowSize, setWindowSize] = useState({ width: 375, height: 667 });

  const [reload, setReload] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(true);
  const { isVip, setLoginShow, appVersion } = useStore();
  const trackMeta = useTracking();

  const getSimilarTemplate = (
    templateId: string,
    pageNum: number,
    pageSize: number
  ) => {
    return request.get(`${API('apiv10')}/templates/similar`, {
      params: {
        platform: getPlatform(),
        cli_rev: appVersion,
        template: templateId,
        p: pageNum,
        n: pageSize,
      },
    });
  };

  const getTemplateInfo = async () => {
    const res = await getTemplateDetail(templateId);
    if (res.data) {
      const data = res.data as TemplateProps;
      setDetail(data);
      setCollected(data.collected);
      setDocumentTitle(data.title);
      setActiveTab('preview');
      setReload(false);
      setViewerLoading(true);
    }
  };

  const initData = async () => {
    await getTemplateInfo();
    mkWebStoreLogger.track_pageview({
      ...trackMeta,
      page_type: 'template_page',
      page_id: templateId,
    });
  };

  useEffect(() => {
    if (templateId) {
      initData();
    }
  }, [templateId]);

  useEffect(() => {
    if (detail) {
      const getSimilarTemplateList = async () => {
        if (loading || finished) {
          return;
        }

        setLoading(true);

        const res = await getSimilarTemplate(templateId, page, PAGA_SIZE);

        if (res?.result?.template_list) {
          const data = res.result.template_list.map((item: any) => {
            return {
              template_id: item.template,
              width: detail?.page_width || 110,
              height: detail?.page_height || 190,
              preview_img: item.preview_image_url,
              thumbnail: item.preview_image_url,
              title: item.name,
              spec_name: item.spec_name,
              price: item.price,
            };
          });
          const newTemplates = page > 1 ? list.concat(data) : data;
          setList(newTemplates);
          setPage(page + 1);
          setLoading(false);
          setFinished(data.length < PAGA_SIZE);
        } else {
          setLoading(false);
          setFinished(true);
        }
      };

      getSimilarTemplateList();
    }
  }, [detail]);

  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     const updateWindowSize = () => {
  //       setWindowSize({
  //         width: document.documentElement.clientWidth,
  //         height: document.documentElement.clientHeight,
  //       });
  //     };
  //     updateWindowSize();
  //     window.addEventListener('resize', updateWindowSize);
  //     return () => window.removeEventListener('resize', updateWindowSize);
  //   }
  // }, []);

  // 骨架屏组件
  const renderSkeleton = () => {
    return (
      <div className='h-full flex flex-col overflow-hidden bg-white'>
        {!hideHeader && (
          <div className='flex-shrink-0 h-11 bg-gray-100 animate-pulse'></div>
        )}
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

  if (!detail) {
    return renderSkeleton();
  }

  const getImgSrc = (src: string) => {
    ['?', '@'].forEach(v => {
      if (src && src.includes(v)) {
        src = src.slice(0, src.indexOf(v));
      }
    });
    return cdnApi(src, {
      resizeWidth: detail.page_width * 2,
    });
  };

  const collectTemplate = (uid: string, templateId: string) => {
    return request.post(
      `${API('主服务API')}/api/plat/v1/users/${uid}/template_collect`,
      {
        template_id: templateId,
      }
    );
  };

  const removeCollectTemplate = (uid: string, templateId: string) => {
    return request.delete(
      `${API('主服务API')}/api/plat/v1/users/${uid}/template_collect`,
      {
        data: {
          template_id: templateId,
        },
      }
    );
  };

  const login = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else {
      setLoginShow(true);
    }
  };

  const onCollectTemplate = async () => {
    const token = getToken();

    if (!token) {
      // 请求登录
      login();
      return;
    }

    const uid = getUid();
    if (collected) {
      await removeCollectTemplate(uid, detail!.id);
    } else {
      await collectTemplate(uid, detail!.id);
    }
    setCollected(!collected);
  };

  const toEditAsk = async () => {
    const token = getToken();
    // 未登录
    if (!token) {
      login();
      return;
    }
    if (editLoading) {
      return;
    }

    setEditLoading(true);
    toast.loading('加载中...');
    const res = await getEditorInfo('template', detail.id);

    if (!res.data || !res.data.type) {
      toast.dismiss();
      setEditLoading(false);
      toast.error((res as any).error || '发生错误~');
      return;
    }

    if (res.data.type !== 'native') {
      // 新编辑器作品
      const params = {
        template_id: detail.id,
        from: 'editor7',
        spec_id: +detail.spec_id,
        category: `${detail.category_id}`,
        secondary_category: detail.secondary_category_id,
        store_category_id: detail.store_category_id,
        spec_id_v7: '',
        design_proc: '',
      };

      const res = (await createWork(params)) as any;

      mkWebStoreLogger.track_click({
        ...trackMeta,
        object_type: 'v5workCreate',
        object_id: res.data.works_id,
      });

      toast.dismiss();
      if (res?.data?.works_id) {
        const query = queryToObj();
        const uid = getUid();

        const params = new URLSearchParams();

        if (query.parent_page_type)
          params.set('parent_page_type', query.parent_page_type);
        if (query.ref_page_id) params.set('ref_page_id', query.ref_page_id);
        if (query.page_inst_id)
          params.set('page_inst_id', decodeURIComponent(query.page_inst_id));
        if (query.hotword_floor_word_btn)
          params.set(
            'hotword_floor_word_btn',
            decodeURIComponent(query.hotword_floor_word_btn)
          );

        if (APPBridge.isRN()) {
          params.set('rn_mode', 'true');
        }
        if (isPc()) {
          let url = `/maka-v2/editor-pc?works_id=${res.data.works_id}&uid=${uid}&${params.toString()}`;
          store.push(url, {
            newWindow: true,
          });
          if (onClose) {
            onClose();
          }
          return;
        }

        let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${res.data.works_id}&uid=${uid}&is_full_screen=1&popEnable=0&${params.toString()}`;
        store.push(url);
      } else {
        toast.error('创建作品失败，请稍后重试');
      }

      setEditLoading(false);
    } else {
      toast.dismiss();
      // 旧编辑器
      toast.error('抱歉，该模版只支持在电脑浏览器内编辑。');
    }
  };

  const toPayment = () => {
    const query = queryToObj();
    const params = new URLSearchParams();

    if (query.parent_page_type)
      params.set('parent_page_type', query.parent_page_type);
    if (query.ref_page_id) params.set('ref_page_id', query.ref_page_id);
    if (query.page_inst_id)
      params.set('page_inst_id', decodeURIComponent(query.page_inst_id));
    if (query.hotword_floor_word_btn)
      params.set(
        'hotword_floor_word_btn',
        decodeURIComponent(query.hotword_floor_word_btn)
      );

    params.set('is_full_screen', '1');

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/vip?${params.toString()}`,
        type: 'URL',
      });
    } else {
      location.href = `/maka/mobile/vip?${params.toString()}&appid=${getAppId()}`;
    }
  };

  const onAppShare = (type = 'wechat') => {
    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title: detail.title,
        content: '',
        thumb: detail.thumb || detail.firstImg,
        type: 'link',
        shareType: type, //微信好友：wechat， 微信朋友圈：wechatTimeline，复制链接：copyLink，二维码分享：qrCode，更多(系统分享)：system
        url: detail.viewerUrl, // 只传一个链接
      },
    });
  };

  const toShare = () => {
    if (APPBridge.judgeIsInApp()) {
      setSharePopup(true);
    } else {
      toast('请点击微信右上角分享');
    }
  };

  const handleCopyTemplateId = () => {
    safeCopy(templateId);
    toast.success('模板ID已复制');
  };

  const handleOpenInNewTab = () => {
    const url = window.location.href;
    window.open(url, '_blank');
  };

  const onChangeTemplateId = (item: TemplateCardData) => {
    setReload(true);
    setTemplateId(item.template_id);
    setPage(1);
    setFinished(false);
    setList([]);

    const params = new URLSearchParams(urlSearchParams);
    params.set('id', item.template_id);
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  // const renderSimilarTemplate = () => {
  //   if (detail.editor_type === 'h5' && activeTab !== 'similar') {
  //     return null;
  //   }

  //   return (
  //     <div
  //       className={cn([
  //         'p-3',
  //         detail.editor_type === 'h5' && 'overflow-y-auto flex-1',
  //       ])}
  //     >
  //       {detail.editor_type === 'poster' && (
  //         <div className='font-semibold text-base leading-6 text-black pb-2'>
  //           相关模版
  //         </div>
  //       )}
  //       <Waterfall
  //         className='grid-cols-3'
  //         template={list}
  //         gutter={10}
  //         useWindow={false}
  //         getScrollParent={() =>
  //           detail.editor_type === 'poster'
  //             ? document.getElementById('scroll-container')
  //             : null
  //         }
  //         loading={loading}
  //         finished={finished}
  //         // track={{
  //         //   page_type: 'template_page',
  //         //   page_inst_id: pageInstId,
  //         //   page_id: templateId,
  //         // }}
  //         onChange={onChangeTemplateId}
  //         onLoad={() => getSimilarTemplateList()}
  //       />
  //     </div>
  //   );
  // };

  const renderPosterPreview = () => {
    return (
      <div className='flex flex-col h-full bg-white overflow-hidden md:flex-row md:w-full md:max-w-6xl md:mx-auto'>
        {/* 预览区域 */}
        <div
          className='flex-1 overflow-y-auto md:flex-1 md:overflow-auto'
          id='scroll-container'
        >
          <div className='p-4 md:p-6 max-w-[375px] mx-auto'>
            <div className='w-full h-auto pb-4'>
              {detail.pagePreviews.length <= 1 ? (
                <img
                  src={getImgSrc(detail.thumb || detail.firstImg)}
                  alt={detail?.title || ''}
                  width={detail.page_width}
                  height={detail.page_height}
                  className='w-full rounded-md mb-4 last:mb-0'
                />
              ) : (
                detail.pagePreviews.map((item, index) => (
                  <img
                    key={index}
                    src={getImgSrc(item)}
                    alt={detail?.title || ''}
                    width={detail.page_width}
                    height={detail.page_height}
                    className='w-full rounded-md mb-4 last:mb-0'
                  />
                ))
              )}
            </div>
            {/* 移动端显示基础信息 */}
            <div className='md:hidden'>
              <div className='font-semibold text-base leading-6 text-black pb-2'>
                {detail.title}
              </div>
              <div className='flex items-center font-normal text-sm leading-[22px]'>
                <span className='text-[rgba(0,0,0,0.6)]'>{`${detail.specName} ${detail.page_width}*${detail.page_height} px`}</span>
                {detail.price > 0 && !isVip && (
                  <span
                    className='flex items-center px-1.5 py-0.5 font-normal text-xs leading-5 ml-2 text-[#735722] bg-gradient-to-r from-[#fee9c1] to-[#f5cc82] rounded cursor-pointer'
                    onClick={toPayment}
                  >
                    会员免费用
                    <Icon name='right' size={12} />
                  </span>
                )}
              </div>
            </div>
          </div>
          <Separator className='md:hidden' />
          {/* {renderSimilarTemplate()} */}
        </div>
        {/* 响应式信息栏：移动端底部，PC端右侧 */}
        <div className='sticky bottom-0 flex items-center p-4 bg-white flex-shrink-0 border-t border-[rgba(0,0,0,0.06)] z-10 md:flex-col md:sticky md:top-0 md:h-full md:w-80 md:border-t-0 md:border-l md:border-[rgba(0,0,0,0.06)] md:items-stretch md:justify-start md:overflow-y-auto'>
          {/* PC端模板信息 */}
          <div className='hidden md:block p-4'>
            <div className='font-semibold text-base leading-6 text-black mb-2'>
              {detail.title}
            </div>
            <div className='flex items-center font-normal text-sm leading-[22px] flex-wrap gap-2 mb-3'>
              <span className='text-[rgba(0,0,0,0.6)]'>{`${detail.specName} ${detail.page_width}*${detail.page_height} px`}</span>
              {detail.price > 0 && !isVip && (
                <span
                  className='flex items-center px-1.5 py-0.5 font-normal text-xs leading-5 text-[#735722] bg-gradient-to-r from-[#fee9c1] to-[#f5cc82] rounded cursor-pointer'
                  onClick={toPayment}
                >
                  会员免费用
                  <Icon name='right' size={12} />
                </span>
              )}
            </div>
            {/* 模板ID显示和操作按钮 */}
            <div className='flex items-center gap-2'>
              <span className='text-xs text-[rgba(0,0,0,0.6)] font-mono truncate'>
                {templateId}
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='h-4 w-4'
                onClick={handleCopyTemplateId}
                title='复制模板ID'
              >
                <Copy className='h-3.5 w-3.5' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-4 w-4'
                onClick={handleOpenInNewTab}
                title='在新标签页中打开'
              >
                <ExternalLink className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>
          {/* 操作按钮 */}
          <div className='flex items-center w-full md:flex-col md:items-stretch md:gap-4 md:p-4 md:pt-6 md:border-t md:border-[rgba(0,0,0,0.06)]'>
            <div
              className='flex flex-col items-center w-11 flex-shrink-0 md:w-auto md:flex-row md:justify-start md:gap-2 cursor-pointer'
              onClick={toShare}
            >
              <Icon name='share' size={24} color='rgba(0, 0, 0, 0.88)' />
              <span className='font-normal text-xs leading-5 text-[rgba(0,0,0,0.6)] md:text-sm md:text-[rgba(0,0,0,0.88)] md:leading-[22px]'>
                分享
              </span>
            </div>
            <div
              className='flex flex-col items-center w-11 flex-shrink-0 md:w-auto md:flex-row md:justify-start md:gap-2 cursor-pointer'
              onClick={() => onCollectTemplate()}
            >
              {collected ? (
                <Icon name='star-tianchong' size={24} color='#FADB14' />
              ) : (
                <Icon name='star' size={24} color='rgba(0, 0, 0, 0.88)' />
              )}
              <span className='font-normal text-xs leading-5 text-[rgba(0,0,0,0.6)] md:text-sm md:text-[rgba(0,0,0,0.88)] md:leading-[22px]'>
                收藏
              </span>
            </div>
            <BehaviorBox
              className='ml-4 w-full md:ml-0 md:mt-0'
              behavior={{
                object_type: 'template_editor_btn',
                object_id: templateId,
              }}
            >
              <Button size='lg' className='w-full' onClick={() => toEditAsk()}>
                {editLoading ? '创建中' : '立即使用'}
              </Button>
            </BehaviorBox>
          </div>
        </div>
      </div>
    );
  };

  const renderH5Preview = () => {
    let style = {};
    console.log('detail', detail);
    if (detail.page_width && detail.page_height) {
      const scale = windowSize.width / 375;
      style = {
        transform: `scale(${scale})`,
        height: `${(windowSize.height - 44) / scale}px`,
        width: `${windowSize.width / scale}px`,
        transformOrigin: '0 0',
      };
    }

    // 骨架屏组件
    const SkeletonViewer = () => (
      <div className='absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center'>
        <div className='w-full h-full flex flex-col items-center justify-center gap-4'>
          <div className='w-16 h-16 bg-gray-300 rounded-full'></div>
          <div className='w-32 h-4 bg-gray-300 rounded'></div>
          <div className='w-48 h-4 bg-gray-300 rounded'></div>
        </div>
      </div>
    );

    return (
      <div className='flex flex-col h-full overflow-hidden relative md:flex-row md:w-full md:max-w-6xl md:mx-auto'>
        <div className='sticky top-0 flex justify-center pt-4 pb-2 flex-shrink-0 z-10 bg-transparent md:absolute md:top-4 md:left-1/2 md:-translate-x-1/2 md:z-20'>
          <div className='flex items-center bg-white rounded-full border border-[rgba(0,0,0,0.06)]'>
            {tabs.map(item => (
              <div
                key={item.key}
                className={cn([
                  'flex items-center px-3 py-1.5 font-medium text-sm leading-[22px] bg-white rounded-full relative',
                  activeTab === item.key
                    ? 'text-white bg-blue-500 z-[1]'
                    : 'text-[rgba(0,0,0,0.88)]',
                ])}
                onClick={() => setActiveTab(item.key)}
              >
                {item.icon && <Icon name={item.icon} />}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='flex-1 flex flex-col overflow-hidden relative md:flex-row'>
          {activeTab === 'preview' && (
            <>
              {/* 预览区域 */}
              <div className='flex-1 flex flex-col overflow-hidden relative py-4'>
                <div className='flex-1 overflow-hidden flex justify-center items-center relative'>
                  <div
                    className='min-w-[375px] min-h-[567px] overflow-auto relative rounded-lg shadow-lg'
                    style={style}
                  >
                    {viewerLoading && <SkeletonViewer />}
                    <iframe
                      src={detail.viewerUrl}
                      style={style}
                      className={cn([
                        'w-full h-full absolute inset-0',
                        viewerLoading && 'opacity-0',
                      ])}
                      onLoad={() => {
                        setViewerLoading(false);
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* 响应式信息栏：移动端底部，PC端右侧 */}
              <div className='absolute left-0 right-0 bottom-0 md:static flex flex-col flex-shrink-0 z-10 bg-gradient-to-t from-[rgba(0,0,0,0.6)] to-[rgba(0,0,0,0)] md:flex md:flex-col md:w-80 md:flex-shrink-0 md:top-0 md:h-full md:border-l md:border-[rgba(0,0,0,0.06)] md:bg-white md:bg-gradient-to-t md:from-white md:to-white md:overflow-y-auto'>
                {/* 模板信息 */}
                <div className='w-fit ml-4 mt-4 px-2 py-1 bg-[rgba(0,0,0,0.6)] rounded md:w-auto md:ml-0 md:mt-0 md:bg-transparent md:p-6'>
                  <div className='block font-semibold text-base leading-6 text-black mb-2'>
                    {detail.title}
                  </div>
                  <div className='flex items-center font-normal text-sm leading-[22px] flex-wrap gap-2 mb-3'>
                    <span className='text-white md:text-[rgba(0,0,0,0.6)]'>
                      {detail.specName}
                    </span>
                    {!isVip && (
                      <span
                        className='flex items-center px-1.5 py-0.5 font-normal text-xs leading-5 ml-2 md:ml-0 text-[#735722] bg-gradient-to-r from-[#fee9c1] to-[#f5cc82] rounded cursor-pointer'
                        onClick={toPayment}
                      >
                        会员免费用
                        <Icon name='right' size={12} />
                      </span>
                    )}
                  </div>
                  {/* 模板ID显示和操作按钮（仅PC端） */}
                  <div className='hidden md:flex items-center gap-2 p-2 bg-gray-50 rounded-md'>
                    <span className='text-xs text-[rgba(0,0,0,0.6)] font-mono flex-1 truncate'>
                      模板ID: {templateId}
                    </span>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={handleCopyTemplateId}
                      title='复制模板ID'
                    >
                      <Copy className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={handleOpenInNewTab}
                      title='在新标签页中打开'
                    >
                      <ExternalLink className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                </div>

                {/* 操作按钮区域 */}
                <div className='flex items-center p-4 md:flex-col md:items-stretch md:gap-2 md:p-6 md:pt-4 md:border-t md:border-[rgba(0,0,0,0.06)]'>
                  {/* 分享按钮 */}
                  <div
                    className='flex flex-col items-center w-11 flex-shrink-0 md:w-auto md:flex-row md:justify-start md:gap-2 cursor-pointer'
                    onClick={toShare}
                  >
                    <div className='flex items-center justify-center w-8 h-8 md:w-auto md:h-auto'>
                      <Icon
                        name='share-dpikkdd9'
                        size={24}
                        color='#fff'
                        className='md:hidden'
                      />
                      <Icon
                        name='share'
                        size={24}
                        color='rgba(0, 0, 0, 0.88)'
                        className='hidden md:block'
                      />
                    </div>
                    <span className='text-white text-xs font-normal leading-5 md:text-sm md:text-[rgba(0,0,0,0.88)] md:leading-[22px]'>
                      分享
                    </span>
                  </div>

                  {/* 收藏按钮 */}
                  <div
                    className='flex flex-col items-center w-11 flex-shrink-0 md:w-auto md:flex-row md:justify-start md:gap-2 cursor-pointer'
                    onClick={() => onCollectTemplate()}
                  >
                    <div className='flex items-center justify-center w-8 h-8 md:w-auto md:h-auto'>
                      {collected ? (
                        <Icon name='star-tianchong' size={24} color='#FADB14' />
                      ) : (
                        <>
                          <Icon
                            name='star'
                            size={24}
                            color='#fff'
                            className='md:hidden'
                          />
                          <Icon
                            name='star'
                            size={24}
                            color='rgba(0, 0, 0, 0.88)'
                            className='hidden md:block'
                          />
                        </>
                      )}
                    </div>
                    <span className='text-white text-xs font-normal leading-5 md:text-sm md:text-[rgba(0,0,0,0.88)] md:leading-[22px]'>
                      收藏
                    </span>
                  </div>

                  {/* 立即使用按钮 */}
                  <BehaviorBox
                    className='ml-4 w-full md:ml-0 md:mt-0'
                    behavior={{
                      object_type: 'template_editor_btn',
                      object_id: templateId,
                    }}
                  >
                    <Button
                      size='lg'
                      className='w-full'
                      onClick={() => toEditAsk()}
                    >
                      {editLoading ? '创建中' : '立即使用'}
                    </Button>
                  </BehaviorBox>
                </div>
              </div>
            </>
          )}

          {/* {activeTab === 'similar' && renderSimilarTemplate()} */}
        </div>
      </div>
    );
  };

  if (reload) {
    return null;
  }

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      {!hideHeader && (
        <MobileHeader title={detail.title} className='flex-shrink-0' />
      )}
      {detail.editor_type === 'poster'
        ? renderPosterPreview()
        : renderH5Preview()}
      <ResponsiveDialog
        className='bg-white rounded-t'
        isOpen={sharePopup}
        onOpenChange={setSharePopup}
      >
        <div className='flex items-center gap-4 px-4 pt-6 pb-11'>
          <div
            className='flex flex-col items-center px-[5px]'
            onClick={() => onAppShare('wechat')}
          >
            <img
              src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_weixin.png'
              className='w-10 h-10'
              alt='微信好友'
            />
            <span className='mt-2 text-xs font-normal leading-5 text-center text-[rgba(0,0,0,0.6)]'>
              微信好友
            </span>
          </div>
          <div
            className='flex flex-col items-center px-[5px]'
            onClick={() => onAppShare('wechatTimeline')}
          >
            <img
              src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_pengyouquan.png'
              className='w-10 h-10'
              alt='朋友圈'
            />
            <span className='mt-2 text-xs font-normal leading-5 text-center text-[rgba(0,0,0,0.6)]'>
              朋友圈
            </span>
          </div>
          <div
            className='flex flex-col items-center px-[5px]'
            onClick={() => onAppShare('system')}
          >
            <img
              src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_gengduo.png'
              className='w-10 h-10'
              alt='更多'
            />
            <span className='mt-2 text-xs font-normal leading-5 text-center text-[rgba(0,0,0,0.6)]'>
              更多
            </span>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default TemplateDetail;
