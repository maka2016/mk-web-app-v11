import {
  formEntityServiceApi,
  getAppId,
  getPageId,
  getUid,
  request,
} from '@mk/services';
import { ViewerSDKProps } from '@mk/widgets-bridge-sdk';
import MkBaoMingV2 from '@mk/widgets/MkBaoMingV2/comp';
import MkBulletScreen_v2 from '@mk/widgets/MkBulletScreen_v2/comp';
import MkGift from '@mk/widgets/MkGift/comp';
import HuizhiComp from '@mk/widgets/MkHuiZhi/comp/indexV1';
import MkPinTuan from '@mk/widgets/MkPinTuan/comp';
import { worksServerV2 } from '@mk/widgets/MkPinTuan/shared/api';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { useEffect, useState } from 'react';
import CommentComp from '../../MkHuiZhi/comp/CommentComp';
import { useGridContext } from './provider';
import { getAllElementRef, getAllLayers } from './utils';

const FormContent: Record<string, any> = {
  MkGift: {
    formName: '礼物',
    fields: [
      {
        id: 'content',
        label: '内容',
      },
      {
        id: 'nickname',
        label: '姓名',
      },
    ],
  },
  MkBulletScreen_v2: {
    formName: '弹幕',
    fields: [
      {
        id: 'content',
        label: '弹幕内容',
      },
      {
        id: 'headImg',
        label: '微信头像',
      },
      {
        id: 'nickname',
        label: '微信昵称',
      },
    ],
  },
  MkHuiZhi: {
    formName: '回执',
    fields: [
      {
        label: '是否出席',
        id: 'isAttend',
      },
      {
        label: '姓名',
        id: 'name',
      },
      {
        label: '性别',
        id: 'gender',
      },
      {
        label: '联系电话',
        id: 'phone',
      },
      {
        label: '出席人数',
        id: 'guestCount',
      },
      {
        label: '备注',
        id: 'remarks',
      },
    ],
  },
  MkPinTuan: {
    formName: '拼团',
    fields: [
      {
        label: '姓名',
        id: 'name',
      },
      {
        label: '联系电话',
        id: 'phone',
      },
      {
        label: '孩子年龄',
        id: 'age',
      },
      {
        label: '备注',
        id: 'remarks',
      },
      {
        label: '课程',
        id: 'courses',
      },
    ],
  },
  MkBaoMingV2: {
    formName: '报名',
    fields: [
      {
        label: '参会姓名',
        id: 'name',
      },
      {
        label: '联系电话',
        id: 'phone',
      },
      {
        label: '所在单位',
        id: 'organization',
      },
      {
        label: '备注',
        id: 'remarks',
      },
      {
        label: '职务职位',
        id: 'position',
      },
    ],
  },
};
const visibilityElementRefs = ['MkBulletScreen_v2', 'MkGift', 'MkPinTuan'];

export const useWidgetsAttrs = (options: {
  needInit?: boolean;
  worksData?: IWorksData;
}) => {
  const { worksData, needInit = false } = options || {};
  const { editorSDK } = useGridContext();
  const [creating, setCreating] = useState(false);
  const worksId = getPageId();
  const [compAttrsMap, setCompAttrsMap] = useState<
    Record<string, LayerElemItem | null>
  >({
    MkPinTuan: null,
    MkBaoMingV2: null,
    MkHuiZhi: null,
    MkBulletScreen_v2: null,
    MkMapV3: null,
    MkGift: null,
  });
  const getLayerByElementRef = (elementRef: string) => {
    const allLayerMap = getAllElementRef(worksData as any);
    const allLayerMap2 = getAllLayers(worksData as any);
    const layerIds = allLayerMap[elementRef];
    return allLayerMap2[layerIds?.[0]] || null;
  };

  const getAllLayerIdsByElementRef = (elementRef: string) => {
    const allLayerMap = getAllElementRef(worksData as any);
    const layerIds = allLayerMap[elementRef];
    return layerIds;
  };

  const addComponentSelf = async (elementRef: string, attrs: any = {}) => {
    if (creating) return;
    setCreating(true);
    let formRefId = '';
    if (FormContent[elementRef]) {
      const res = await formEntityServiceApi.create({
        uid: +getUid(),
        works_id: worksId,
        type: elementRef,
        content: FormContent[elementRef],
      });

      if (res.data.formId) {
        formRefId = res.data.formId;
      }
    }

    const elemId = editorSDK?.addComponent(
      {
        elementRef: elementRef,
        attrs: {
          show: true,
          formRefId: formRefId,
          ...attrs,
        },
      },
      {
        visibility: visibilityElementRefs.includes(elementRef),
        lock: true,
        disabled: !visibilityElementRefs.includes(elementRef),
        x: 0,
        y: 0,
      }
    );
    setCreating(false);
    return elemId;
  };

  const getFormEntity = async (layer: LayerElemItem) => {
    if (!layer) {
      return;
    }
    const res: any = await formEntityServiceApi.findOne(layer.attrs.formRefId);
    if (res.data.worksId !== getPageId()) {
      const content = res.data.content;
      delete content.formId;
      const _res = await formEntityServiceApi.create({
        content: content,
        works_id: getPageId(),
        uid: +getUid(),
        type: layer.elementRef,
      });
      editorSDK?.changeCompAttr(layer.elemId, {
        formRefId: _res.data.formId,
      });
    }
  };

  // 集赞组件
  const getBoostActivity = async (layer: LayerElemItem) => {
    if (!layer?.attrs?.boostActivityId) {
      return;
    }
    const res: any = await request.get(
      `${worksServerV2()}/boost-activity/${layer.attrs.boostActivityId}`
    );

    if (res.worksId !== getPageId()) {
      const createRes: any = await request.post(
        `${worksServerV2()}/boost-activity`,
        {
          requiredPeople: res.requiredPeople,
          timeLimit: res.timeLimit,
          uid: +getUid(),
          worksId: getPageId(),
          type: res.type,
        }
      );

      editorSDK?.changeCompAttr(layer.elemId, {
        boostActivityId: createRes.id,
      });
    }
  };

  // 拼团组件
  const getGroupBuyActivity = async (layer: LayerElemItem) => {
    if (!layer?.attrs?.groupBuyActivityId) {
      return;
    }
    const res: any = await request.get(
      `${worksServerV2()}/group-buy/${layer.attrs.groupBuyActivityId}`
    );

    if (res.worksId !== getPageId()) {
      const createRes: any = await request.post(
        `${worksServerV2()}/group-buy`,
        {
          requiredPeople: res.requiredPeople,
          timeLimit: res.timeLimit,
          uid: +getUid(),
          worksId: getPageId(),
        }
      );

      editorSDK?.changeCompAttr(layer.elemId, {
        groupBuyActivityId: createRes.id,
      });
    }
  };

  const getWidgetList = () => [
    {
      elementRef: 'MkPinTuan',
      name: '学迹拼团',
      appid: 'xueji',
      onInit: async () => {
        const layer = getLayerByElementRef('MkPinTuan');
        if (!layer) {
          await addComponentSelf('MkPinTuan');
        } else {
          await Promise.all([
            getFormEntity(layer),
            getBoostActivity(layer),
            getGroupBuyActivity(layer),
          ]);
        }
      },
      onAdd: async () => {
        const layer = getLayerByElementRef('MkPinTuan');
        if (layer) {
          editorSDK?.changeCompAttr(layer.elemId, {
            show: true,
          });
          return;
        } else {
          await addComponentSelf('MkPinTuan', {
            courseOptions: '基础班，提高班，精品班',
            show: true,
          });
        }
      },
      onDisable: () => {
        const layer = getLayerByElementRef('MkPinTuan');
        if (layer) {
          editorSDK?.changeCompAttr(layer.elemId, {
            show: false,
          });
        }
      },
      onRemove: () => {
        const layer = getLayerByElementRef('MkPinTuan');
        if (layer) {
          editorSDK?.deleteCompEntity(layer.elemId);
        }
      },
    },
    {
      elementRef: 'MkBaoMingV2',
      name: '会邀报名',
      appid: 'huiyao',
      onInit: async () => {
        const layer = getLayerByElementRef('MkBaoMingV2');
        if (!layer) {
          await addComponentSelf('MkBaoMingV2');
        } else {
          await getFormEntity(layer);
        }
      },
      onAdd: async () => {
        const layer = getLayerByElementRef('MkBaoMingV2');
        if (layer) {
          editorSDK?.changeCompAttr(layer.elemId, {
            show: true,
          });
        } else {
          await addComponentSelf('MkBaoMingV2');
        }
      },
      onDisable: () => {
        const layer = getLayerByElementRef('MkBaoMingV2');
        if (layer) {
          editorSDK?.changeCompAttr(layer.elemId, {
            show: false,
          });
        }
      },
      onRemove: () => {
        const layer = getLayerByElementRef('MkBaoMingV2');
        if (layer) {
          editorSDK?.deleteCompEntity(layer.elemId);
        }
      },
    },
    {
      elementRef: 'MkHuiZhi',
      name: '简帖回执',
      appid: 'jiantie',
      onInit: async () => {
        const layer = getLayerByElementRef('MkHuiZhi');
        if (!layer) {
          // await addComponentSelf('MkHuiZhi');
          // await addComponentSelf('MkBulletScreen_v2');
          // await addComponentSelf('MkGift');
        } else {
          const MkBulletScreen_v2 = getLayerByElementRef('MkBulletScreen_v2');
          const MkGift = getLayerByElementRef('MkGift');
          await Promise.all([
            getFormEntity(layer),
            getFormEntity(MkBulletScreen_v2),
            getFormEntity(MkGift),
          ]);
        }
      },
      onAdd: async () => {
        const layer = getLayerByElementRef('MkHuiZhi');
        if (layer) {
          editorSDK?.changeCompAttr(layer.elemId, {
            show: true,
            inLayout: true,
          });
        } else {
          await addComponentSelf('MkHuiZhi');
          await addComponentSelf('MkBulletScreen_v2');
          await addComponentSelf('MkGift');
        }
      },
      onDisable: () => {
        const huizhiLayer = getLayerByElementRef('MkHuiZhi');
        const bulletScreenLayer = getLayerByElementRef('MkBulletScreen_v2');
        const giftLayer = getLayerByElementRef('MkGift');
        [huizhiLayer, bulletScreenLayer, giftLayer].forEach(layer => {
          editorSDK?.changeCompAttr(layer.elemId, {
            show: false,
          });
        });
      },
      onRemove: () => {
        const huizhiLayer = getAllLayerIdsByElementRef('MkHuiZhi');
        const bulletScreenLayer =
          getAllLayerIdsByElementRef('MkBulletScreen_v2');
        const giftLayer = getAllLayerIdsByElementRef('MkGift');
        [...huizhiLayer, ...bulletScreenLayer, ...giftLayer].forEach(layer => {
          editorSDK?.deleteCompEntity(layer);
        });
      },
    },
  ];

  useEffect(() => {
    setCompAttrsMap({
      MkPinTuan: getLayerByElementRef('MkPinTuan'),
      MkBaoMingV2: getLayerByElementRef('MkBaoMingV2'),
      MkHuiZhi: getLayerByElementRef('MkHuiZhi'),
      MkBulletScreen_v2: getLayerByElementRef('MkBulletScreen_v2'),
      MkMapV3: getLayerByElementRef('MkMapV3'),
      MkGift: getLayerByElementRef('MkGift'),
    });
  }, [worksData]);

  useEffect(() => {
    if (needInit) {
      const initComponent = () => {
        if (editorSDK) {
          const appid = getAppId();
          getWidgetList().forEach(item => {
            if (appid === item.appid) {
              item.onInit();
            }
          });
        }
      };
      initComponent();
    }
  }, [needInit]);

  return {
    compAttrsMap,
    getWidgetList,
    addComponentSelf,
  };
};

export default function WidgetLoader({
  worksData,
  viewewSDK,
}: {
  worksData: IWorksData;
  viewewSDK?: ViewerSDKProps;
}) {
  const { compAttrsMap } = useWidgetsAttrs({ worksData });
  const appid = getAppId();
  return (
    <div>
      {compAttrsMap.MkHuiZhi &&
        appid === 'jiantie' &&
        (!compAttrsMap.MkHuiZhi.attrs.inLayout ? (
          <HuizhiComp
            compAttrsMap={{
              MkHuiZhi: compAttrsMap.MkHuiZhi,
              MkBulletScreen_v2: compAttrsMap.MkBulletScreen_v2,
              MkMapV3: compAttrsMap.MkMapV3,
              MkGift: compAttrsMap.MkGift,
            }}
          />
        ) : (
          <CommentComp
            compAttrsMap={{
              MkBulletScreen_v2: compAttrsMap.MkBulletScreen_v2,
              MkGift: compAttrsMap.MkGift,
            }}
          />
        ))}
      {compAttrsMap.MkPinTuan && appid === 'xueji' && (
        <MkPinTuan
          id={compAttrsMap.MkPinTuan?.elemId || ''}
          key={compAttrsMap.MkPinTuan?.elemId || '1'}
          pageInfo={{
            pageIndex: 0,
            id: '',
            layers: [],
            opacity: 1,
            background: {},
            width: 0,
            height: 0,
          }}
          widgetState={{}}
          getWorksData={() => worksData}
          worksType={''}
          canvaInfo={{
            scaleRate: 1,
            canvaH: 0,
            canvaW: 0,
            scaleZommRate: 1,
          }}
          containerInfo={
            {
              width: 'auto',
              height: 'auto',
              x: 0,
              y: 0,
            } as any
          }
          controledValues={compAttrsMap.MkPinTuan?.attrs as any}
          viewerSDK={viewewSDK as any}
          lifecycle={{
            didMount: () => {},
            didLoaded: () => {},
          }}
          isActivePage={true}
          isShowPage={true}
        />
      )}
      {compAttrsMap.MkBaoMingV2 && appid === 'huiyao' && (
        <MkBaoMingV2
          id={compAttrsMap.MkBaoMingV2?.elemId || ''}
          key={compAttrsMap.MkBaoMingV2?.elemId || '2'}
          pageInfo={{
            pageIndex: 0,
            id: '',
            layers: [],
            opacity: 1,
            background: {},
            width: 0,
            height: 0,
          }}
          widgetState={{}}
          getWorksData={() => worksData}
          worksType={''}
          canvaInfo={{
            scaleRate: 1,
            canvaH: 0,
            canvaW: 0,
            scaleZommRate: 1,
          }}
          containerInfo={
            {
              width: 'auto',
              height: 'auto',
              x: 0,
              y: 0,
            } as any
          }
          controledValues={compAttrsMap.MkBaoMingV2?.attrs as any}
          viewerSDK={viewewSDK as any}
          lifecycle={{
            didMount: () => {},
            didLoaded: () => {},
          }}
          isActivePage={true}
          isShowPage={true}
        />
      )}

      {compAttrsMap.MkGift && (
        <MkGift
          id={compAttrsMap.MkGift?.elemId || ''}
          key={compAttrsMap.MkGift?.elemId || '3'}
          pageInfo={{
            pageIndex: 0,
            id: '',
            layers: [],
            opacity: 1,
            background: {},
            width: 0,
            height: 0,
          }}
          widgetState={{}}
          getWorksData={() => worksData}
          worksType={''}
          canvaInfo={{
            scaleRate: 1,
            canvaH: 0,
            canvaW: 0,
            scaleZommRate: 1,
          }}
          containerInfo={
            {
              width: 'auto',
              height: 'auto',
              x: 0,
              y: 0,
            } as any
          }
          controledValues={compAttrsMap.MkGift?.attrs as any}
          viewerSDK={viewewSDK as any}
          lifecycle={{
            didMount: () => {},
            didLoaded: () => {},
          }}
          isActivePage={true}
          isShowPage={true}
        />
      )}

      {compAttrsMap.MkBulletScreen_v2 && (
        <MkBulletScreen_v2
          id={compAttrsMap.MkBulletScreen_v2?.elemId || ''}
          key={compAttrsMap.MkBulletScreen_v2?.elemId || '4'}
          pageInfo={{
            pageIndex: 0,
            id: '',
            layers: [],
            opacity: 1,
            background: {},
            width: 0,
            height: 0,
          }}
          widgetState={{}}
          getWorksData={() => worksData}
          worksType={''}
          canvaInfo={{
            scaleRate: 1,
            canvaH: 0,
            canvaW: 0,
            scaleZommRate: 1,
          }}
          containerInfo={
            {
              width: 'auto',
              height: 'auto',
              x: 0,
              y: 0,
            } as any
          }
          controledValues={compAttrsMap.MkBulletScreen_v2?.attrs as any}
          viewerSDK={viewewSDK as any}
          lifecycle={{
            didMount: () => {},
            didLoaded: () => {},
          }}
          isActivePage={true}
          isShowPage={true}
        />
      )}
    </div>
  );
}
