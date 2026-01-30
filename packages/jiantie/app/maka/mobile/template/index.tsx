'use client';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BehaviorBox } from '@/components/BehaviorTracker';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
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
import {
  isAndroid,
  isIOS,
  queryToObj,
  random,
  setDocumentTitle,
} from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import toast from 'react-hot-toast';
import { TemplateCardData } from '../channel/components/TemplateCard';
import Waterfall from '../channel/components/Waterfall';
import styles from './template.module.scss';

interface Props {
  id: string;
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
  const router = useRouter();
  const [templateId, setTemplateId] = useState(props.id);
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
  const { isVip, setLoginShow, appVersion } = useStore();

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
    }
  };

  const getSimilarTemplateList = async () => {
    if (loading || finished) {
      return;
    }

    setLoading(false);

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
      setFinished(data.length <= 0);
    } else {
      setLoading(false);
      setFinished(true);
    }
  };

  const initData = async () => {
    await getTemplateInfo();
    mkWebStoreLogger.track_pageview({
      page_type: 'template_page',
      page_id: templateId,
      page_inst_id: pageInstId,
      works_type: detail?.editor_type,
      work_specs: detail?.spec_id,
    });
  };

  useEffect(() => {
    if (templateId) {
      initData();
    }
  }, [templateId]);

  useEffect(() => {
    if (detail) {
      getSimilarTemplateList();
    }
  }, [detail]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateWindowSize = () => {
        setWindowSize({
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        });
      };
      updateWindowSize();
      window.addEventListener('resize', updateWindowSize);
      return () => window.removeEventListener('resize', updateWindowSize);
    }
  }, []);

  if (!detail) {
    return null;
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

        mkWebStoreLogger.track_click({
          ref_page_id: query.ref_page_id,
          ref_page_type: query.ref_page_type,
          search_word: decodeURIComponent(query.search_word),
          object_type: 'v5workCreate',
          object_id: res.data.works_id,
        });

        if (APPBridge.isRN()) {
          params.set('rn_mode', 'true');
        }
        let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${res.data.works_id}&uid=${uid}&is_full_screen=1&popEnable=0&${params.toString()}`;

        if (APPBridge.judgeIsInApp()) {
          if (isIOS()) {
            url += '&runtime=IOS';
          } else if (isAndroid()) {
            url += '&runtime=ANDROID';
          }
          APPBridge.navToPage({
            url,
            type: 'URL',
          });
        } else {
          location.href = url + `&appid=${getAppId()}`;
        }
      } else {
        toast.error('创建作品不成功，请稍后重试');
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

  const onChangeTemplateId = (item: TemplateCardData) => {
    setReload(true);
    setTemplateId(item.template_id);
    setPage(1);
    setFinished(false);
    setList([]);
    // router.replace(`/maka/mobile/template?id=${item.template_id}`);

    const params = new URLSearchParams(urlSearchParams);
    params.set('id', item.template_id);
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  const renderSimilarTemplate = () => {
    return (
      <div
        className={cn([
          styles.similarTemplate,
          activeTab !== 'similar' && detail.editor_type === 'h5' && styles.hide,
          detail.editor_type === 'h5' && 'overflow-y-auto h-full',
        ])}
      >
        {detail.editor_type === 'poster' && (
          <div className={styles.title}>相关模版</div>
        )}
        <Waterfall
          template={list}
          gutter={10}
          useWindow={false}
          getScrollParent={() =>
            detail.editor_type === 'poster'
              ? document.getElementById('scroll-container')
              : null
          }
          loading={loading}
          finished={finished}
          // track={{
          //   page_type: 'template_page',
          //   page_inst_id: pageInstId,
          //   page_id: templateId,
          // }}
          onChange={onChangeTemplateId}
          onLoad={() => getSimilarTemplateList()}
        />
      </div>
    );
  };

  const renderPosterPreview = () => {
    return (
      <div className={styles.template} id='scroll-container'>
        <div className={styles.templateDetail}>
          <div className={styles.preview}>
            {detail.pagePreviews.length <= 1 ? (
              <img
                src={getImgSrc(detail.thumb || detail.firstImg)}
                alt={detail?.title || ''}
                width={detail.page_width}
                height={detail.page_height}
              />
            ) : (
              detail.pagePreviews.map((item, index) => (
                <img
                  key={index}
                  src={getImgSrc(item)}
                  alt={detail?.title || ''}
                  width={detail.page_width}
                  height={detail.page_height}
                />
              ))
            )}
          </div>
          <div className={styles.title}>{detail.title}</div>
          <div className={styles.info}>
            <span
              className={styles.spec}
            >{`${detail.specName} ${detail.page_width}*${detail.page_height} px`}</span>
            {detail.price > 0 && !isVip && (
              <span className={styles.vip} onClick={toPayment}>
                会员免费用
                <Icon name='right' size={12} />
              </span>
            )}
          </div>
        </div>
        <Separator />
        {renderSimilarTemplate()}
        <div className={styles.btn}>
          <div className={styles.action} onClick={toShare}>
            <Icon name='share' size={24} color='rgba(0, 0, 0, 0.88)' />
            <span>分享</span>
          </div>
          <div className={styles.action} onClick={() => onCollectTemplate()}>
            {collected ? (
              <Icon name='star-tianchong' size={24} color='#FADB14' />
            ) : (
              <Icon name='star' size={24} color='rgba(0, 0, 0, 0.88)' />
            )}
            <span>收藏</span>
          </div>
          <Button size='lg' className={styles.edit} onClick={() => toEditAsk()}>
            {editLoading ? '创建中' : '立即使用'}
          </Button>
        </div>
      </div>
    );
  };

  const renderH5Preview = () => {
    let style = {};
    if (detail.page_width && detail.page_height) {
      const scale = windowSize.width / 375;
      style = {
        transform: `scale(${scale})`,
        height: `${(windowSize.height - 44) / scale}px`,
        width: `${windowSize.width / scale}px`,
        transformOrigin: '0 0',
      };
    }

    return (
      <div className={styles.h5Detail}>
        <div className={styles.switch}>
          {tabs.map(item => (
            <div
              key={item.key}
              className={cn([
                styles.item,
                activeTab === item.key && styles.active,
              ])}
              onClick={() => setActiveTab(item.key)}
            >
              {item.icon && <Icon name={item.icon} />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div
          className={cn([
            styles.viewer,
            activeTab !== 'preview' && styles.hide,
          ])}
        >
          <iframe src={detail.viewerUrl} style={style} />
          <div className={styles.h5Info}>
            <div className={styles.info}>
              <span className={styles.spec}>{detail.specName}</span>
              {!isVip && (
                <span className={styles.vip} onClick={toPayment}>
                  会员免费用
                  <Icon name='right' size={12} />
                </span>
              )}
            </div>

            <div className={cn([styles.btn, styles.h5Btn])}>
              <div className={styles.action}>
                <div className={styles.icon} onClick={toShare}>
                  <Icon name='share-dpikkdd9' size={24} color='#fff' />
                </div>
                <span>分享</span>
              </div>
              <div
                className={styles.action}
                onClick={() => onCollectTemplate()}
              >
                <div className={styles.icon}>
                  {collected ? (
                    <Icon name='star-tianchong' size={24} color='#FADB14' />
                  ) : (
                    <Icon name='star' size={24} color='#fff' />
                  )}
                </div>

                <span>收藏</span>
              </div>
              <BehaviorBox
                className={styles.edit}
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
        </div>

        {renderSimilarTemplate()}
      </div>
    );
  };

  if (reload) {
    return null;
  }

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <MobileHeader title={detail.title} className='flex-shrink-0' />
      {detail.editor_type === 'poster'
        ? renderPosterPreview()
        : renderH5Preview()}
      <div className={styles.share}>
        <ResponsiveDialog
          className={styles.sharePopup}
          isOpen={sharePopup}
          onOpenChange={setSharePopup}
        >
          <div className={styles.shareTypes}>
            <div
              className={styles.shareItem}
              onClick={() => onAppShare('wechat')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_weixin.png' />
              <span>微信好友</span>
            </div>
            <div
              className={styles.shareItem}
              onClick={() => onAppShare('wechatTimeline')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_pengyouquan.png' />
              <span>朋友圈</span>
            </div>
            <div
              className={styles.shareItem}
              onClick={() => onAppShare('system')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_gengduo.png' />
              <span>更多</span>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </div>
  );
};

export default TemplateDetail;
