'use client';
import { getAllLayers } from '@/app/editor/SimpleEditor/utils';
import { getAppId, getCmsApiHost, getUid, requestCMS } from '@/services';
import { getWorkData2 } from '@/services/works2';
import { useStore } from '@/store';
import WebsiteApp from '@mk/viewer/components/website';
import { LayerElemItem } from '@mk/works-store/types';
import { useSearchParams } from 'next/navigation';
import qs from 'qs';
import { useEffect, useState } from 'react';
import { Template } from '../../channel/components/template-card';

interface Props {
  widgetRely: any;
  initProps: any;
  useTools?: boolean;
  useAutoScrollByDefault?: boolean;
  templateId?: string;
}

const Main = (props: Props) => {
  const {
    widgetRely,
    initProps,
    useTools = true,
    useAutoScrollByDefault = true,
    templateId,
  } = props;
  const [loaded, setLoaded] = useState(false);
  const searchParams = useSearchParams();
  const pre_works_id = searchParams.get('pre_works_id');
  const [pictureLayers, setPictureLayers] = useState<LayerElemItem[]>([]);
  const [preWorksDataLoaded, setPreWorksDataLoaded] = useState(false);
  const [update, setUpdate] = useState(0);
  const [templateItem, setTemplateItem] = useState<Template>();
  const { vipABTest } = useStore();
  const appid = getAppId();

  // 编辑器更换模版预览效果
  const updatePictureLayer = (item: LayerElemItem, picture: any) => {
    if (!picture) return;
    item.attrs = {
      ...item.attrs,
      ossPath: picture.attrs?.ossPath,
      originBaseW: picture.attrs?.originBaseW,
      originBaseH: picture.attrs?.originBaseH,
      objectPosition: {
        x: 50,
        y: 0,
        size: 'cover',
      },
    };
    setUpdate(update + 1);
  };

  const isEditableElement = (element: Element | null): boolean => {
    if (!element) return false;
    const aspectRatio = element.clientWidth / element.clientHeight;
    return (
      aspectRatio > 0.5 &&
      aspectRatio < 2 &&
      element.clientWidth > window.innerWidth / 3
    );
  };

  const getPreWorksData = async () => {
    if (pre_works_id) {
      const preWorksDataRes = await getWorkData2(pre_works_id);
      const preWorksData = (preWorksDataRes as any)?.work_data;
      if (!preWorksData) return;

      const uid = getUid();
      const layers = getAllLayers(preWorksData).filter(
        item =>
          item.elementRef === 'Picture' && item.attrs?.ossPath?.includes(uid)
      );

      setPictureLayers(layers);
      setPreWorksDataLoaded(true);
      setUpdate(update + 1);
    }
  };

  const initData = async () => {
    if (pictureLayers.length === 0) return;

    let pictureIndex = 0;
    const layers = getAllLayers(initProps.worksData);
    const gridV3 = layers.find(item => item.elementRef === 'GridV3');

    if (!gridV3) return;

    const { cellsMap = [] } = gridV3.attrs;

    for (const row of cellsMap) {
      const cells = row?.cells || [];

      for (const cell of cells) {
        const childrenIds = cell?.childrenIds || [];

        for (const childId of childrenIds) {
          if (pictureIndex >= pictureLayers.length) return;

          const layerItem = layers.find(layer => layer.elemId === childId);
          if (
            !layerItem ||
            layerItem.elementRef !== 'Picture' ||
            layerItem.attrs.absoluteElem
          )
            continue;

          const el = document.querySelector<HTMLElement>(
            `div[data-id="${layerItem.elemId}"]`
          );
          if (!isEditableElement(el)) continue;

          updatePictureLayer(layerItem, pictureLayers[pictureIndex]);
          pictureIndex++;
        }
      }
    }
  };

  useEffect(() => {
    if (pre_works_id && !preWorksDataLoaded) {
      getPreWorksData();
    }
  }, [pre_works_id, preWorksDataLoaded]);

  useEffect(() => {
    if (loaded) {
      initData();
    }
  }, [loaded, pictureLayers]);

  const getTemplateItem = async () => {
    const query = qs.stringify(
      {
        populate: {
          tags: {
            populate: '*',
          },
        },
        filters: {
          template_id: {
            $eq: templateId,
          },
        },
        pagination: {
          pageSize: 1,
          page: 1,
        },
      },
      { encodeValuesOnly: true }
    );
    const res = await requestCMS.get(
      `${getCmsApiHost()}/api/template-items?${query}`
    );
    if (res?.data?.data?.length) {
      const item = res.data.data[0];
      setTemplateItem(item);
    }
  };

  useEffect(() => {
    if (templateId) {
      getTemplateItem();
    }
  }, [templateId]);

  const isPoster =
    initProps.worksDetail?.specInfo?.export_format?.includes('image');

  return (
    <>
      <WebsiteApp
        key={templateId}
        widgetRely={widgetRely.allWidgetRely as any}
        {...initProps}
        useAutoScrollByDefault={useAutoScrollByDefault}
        onViewerLoaded={() => {
          setLoaded(true);
          if (loaded && pictureLayers.length) {
            initData();
          }
        }}
      />
      {/* {vipABTest === 'test' &&
        appid === 'jiantie' &&
        templateItem?.config &&
        templateItem?.config.saleType !== 'free' &&
        (templateItem?.config?.price || templateItem?.config?.vipTag) && (
          <div className={styles.templateInfo}>
            <div className='flex items-center justify-start gap-3'>
              <div className={styles.desc}>
                {initProps.worksDetail?.specInfo.display_name}
                {isPoster &&
                  ` ${initProps.worksDetail?.specInfo?.viewport_width}*${Math.floor(
                    (initProps.worksDetail?.specInfo?.viewport_width /
                      initProps.worksDetail?.specInfo?.width) *
                      initProps.worksDetail?.specInfo?.height
                  )}`}
              </div>
              {!!templateItem?.config?.price && (
                <div className={styles.price}>
                  单独购买：<span>¥{templateItem.config.price / 100}</span>
                </div>
              )}
              {templateItem?.config?.vipTag && (
                <div
                  className={cls([
                    styles.vipTag,
                    styles[templateItem.config.vipTag],
                  ])}
                  onClick={() =>
                    toVipPage({
                      spuCode: templateItem.config?.vipTag,
                    })
                  }
                >
                  <span> {templateItem.config.vipTag.toUpperCase()}免费用</span>
                  <Icon name='right-bold' size={12} />
                </div>
              )}
            </div>
          </div>
        )} */}
    </>
  );
};

export default Main;
