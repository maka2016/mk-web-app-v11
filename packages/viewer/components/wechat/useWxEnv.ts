import { WorksDetailEntity } from '@mk/services';
import { isPc, isWechat } from '@mk/utils';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { useEffect, useState } from 'react';
import makaAssistantTracker, {
  getWorkDetailForMA,
} from '../../services/makaAssistantTracker';
import { getWechatInfo } from './wechatInfo';
import { wechatShare } from './wechatShare';

const checkIsNeedWXAuth = (worksData?: IWorksData) => {
  if (!worksData) {
    return false;
  }
  let needWxAuth = !!worksData.meta?.needWxAuth;

  const recursive = (currLayers: LayerElemItem[]) => {
    if (needWxAuth) return;
    if (Array.isArray(currLayers)) {
      // widgetCountInLayers += currLayers.length
      for (let idx = 0; idx < currLayers.length; idx++) {
        const layer = currLayers[idx];

        if (layer.body && Array.isArray(layer.body)) {
          // widgetCountInLayers -= 1;
          recursive(layer.body);
        }
        if (!needWxAuth) {
          if (layer?.attrs?.needWXAuth || layer?.attrs?.needWxAuth) {
            needWxAuth = true;
          }
        }
      }
    }
  };

  worksData.canvasData.content.pages.forEach(currPage => {
    recursive(currPage.layers);
  });

  return needWxAuth;
};

export const useWxEnv = (
  {
    onInit,
    worksDetail,
  }: {
    onInit: () => void;
    worksDetail: WorksDetailEntity;
  },
  worksData?: IWorksData
) => {
  const [isWxLogged, setIsLogin] = useState(false);
  const [isNeedWxAuth, setIsNeedWxAuth] = useState(false);
  const [showWXAuthPanel, setShowWXAuthPanel] = useState(
    !isWxLogged && isNeedWxAuth
  );

  useEffect(() => {
    /** 营销助手初始化 */
    if (typeof document === 'undefined') return;

    const needShowPanel = !isWxLogged && isNeedWxAuth;
    setShowWXAuthPanel(needShowPanel);

    const initMA = async () => {
      const wechatInfo = getWechatInfo();
      const wechatClientInfo = wechatInfo.getWechatClientInfo();

      /** 给营销助手的作品详情 */
      const workDetailForMA = getWorkDetailForMA(
        worksDetail,
        worksDetail.id,
        worksDetail.uid
      );

      if (!workDetailForMA || !worksData) return;

      await makaAssistantTracker.init(workDetailForMA, wechatClientInfo);
      makaAssistantTracker.track('track_pv', {});
      makaAssistantTracker.trackPage(1);

      // 微信分享
      wechatShare(worksDetail, {
        currHash: makaAssistantTracker.hash,
      }).then(obj => {
        onInit();
      });
    };

    initMA();
    return () => {
      makaAssistantTracker.ma?.destroy();
    };
  }, [typeof document, isWxLogged, isNeedWxAuth]);

  useEffect(() => {
    /** 是否需要微信授权 */
    if (typeof window === 'undefined') return;
    if (!worksData) return;
    const init = async () => {
      // await initWechatEnv(worksData, { worksId, uid })
      if (!isWechat() || window.parent !== window) return;
      const wechatInfo = getWechatInfo();
      /** 微信授权 */
      const needWxAuth = checkIsNeedWXAuth(worksData);
      wechatInfo.setNeedAuth(needWxAuth);
      setIsNeedWxAuth(needWxAuth);
      if (needWxAuth) {
        setIsLogin(wechatInfo.isReady);
      }
    };
    init();
  }, [typeof window, worksData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    /** 解决微信安卓文字缩放的问题 */
    const WeixinJSBridge = (window as any).WeixinJSBridge;
    if (
      !isPc() &&
      typeof WeixinJSBridge == 'object' &&
      typeof WeixinJSBridge.invoke == 'function'
    ) {
      const handleFontSize = () => {
        if (
          typeof WeixinJSBridge == 'object' &&
          typeof WeixinJSBridge.invoke == 'function'
        ) {
          // 设置网页字体为默认大小
          WeixinJSBridge.invoke('setFontSizeCallback', { fontSize: 0 });
          // 重写设置网页字体大小的事件
          WeixinJSBridge.on('menu:setfont', function () {
            WeixinJSBridge.invoke('setFontSizeCallback', { fontSize: 0 });
          });
        }
      };
      if (
        typeof WeixinJSBridge == 'object' &&
        typeof WeixinJSBridge.invoke == 'function'
      ) {
        handleFontSize();
      } else {
        document.addEventListener('WeixinJSBridgeReady', handleFontSize, false);
      }
    }
  }, [typeof window]);

  return {
    showWXAuthPanel,
    setShowWXAuthPanel,
    isWxLogged,
    isNeedWxAuth,
    setIsLogin,
  };
};
