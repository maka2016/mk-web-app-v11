import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import { getCookie, isWechat, SerializedWorksEntity } from '@/utils';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { wechatShare } from './wechatShare';
import WxAuthPanel from './WxAuth';

export interface WechatClientInfo {
  wechatName: string;
  wxAvatar: string;
  openId: string;
  unionId: string;
}

const defaultAvatar =
  'https://makapicture.oss-cn-beijing.aliyuncs.com/cdn/viewer/default_wx_avatar.png';

const checkIsNeedWXAuth = (worksData?: IWorksData) => {
  if (!worksData) {
    return false;
  }
  let needWxAuth = false;

  return needWxAuth;
};

const useWxEnv = (
  worksData: IWorksData,
  worksDetail: SerializedWorksEntity
) => {
  const [isWxLogged, setIsLogin] = useState(false);
  const [isNeedWxAuth, setIsNeedWxAuth] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [wechatClientInfo, setWechatClientInfo] = useState<WechatClientInfo>({
    wechatName: '微信昵称',
    wxAvatar: defaultAvatar,
    openId: '',
    unionId: '',
  });
  const [showWXAuthPanel, setShowWXAuthPanel] = useState(
    !isWxLogged && isNeedWxAuth
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const needShowPanel = !isWxLogged && isNeedWxAuth;
    setShowWXAuthPanel(needShowPanel);

    return () => {};
  }, [isWxLogged, isNeedWxAuth]);

  useEffect(() => {
    /** 是否需要微信授权 */
    if (typeof window === 'undefined') return;
    if (!worksData) return;
    const init = async () => {
      // await initWechatEnv(worksData, { worksId, uid })
      if (!isWechat() || window.parent !== window) return;
      /** 微信授权 */
      const needWxAuth = checkIsNeedWXAuth(worksData);
      setShowWXAuthPanel(needWxAuth);
      setIsNeedWxAuth(needWxAuth);
      if (needWxAuth) {
        setIsLogin(getHasAuth());
      }
      wechatShare({
        title: worksDetail?.title || '',
        desc: worksDetail?.desc || '',
        cover: worksDetail?.cover || '',
      });
    };
    init();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    /** 解决微信安卓文字缩放的问题 */
    const WeixinJSBridge = (window as any).WeixinJSBridge;
    if (
      isWechat() &&
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
  }, []);

  /**
   * 跳转到微信授权
   */
  const jumpToAuth = () => {
    const authHost = `https://works.maka.im/works/api/v1/wechat/oauth`;
    console.log('wxpreset url参数(decode前)', location.href);
    console.log(
      'wxpreset url参数(decode后)',
      encodeURIComponent(location.href)
    );
    const wxpresetUrl = `${location.origin}/wxpreset?url=${encodeURIComponent(location.href)}`;
    const authUrl = `${authHost}?url=${encodeURIComponent(wxpresetUrl)}&config=maka_gzh`;
    window.location.href = authUrl;
  };

  /**
   * 设置是否需要授权
   */
  const setNeedAuth = (nextVal: boolean) => {
    setIsNeedWxAuth(nextVal);
    setShowWXAuthPanel(nextVal);
  };

  /**
   * 客户端初始化逻辑
   */
  const clientInit = () => {
    const _isReady = !!getCookie('nickname') && isWechat();
    if (_isReady) {
      setIsReady(_isReady);
    }
    if (isNeedWxAuth && !_isReady) {
      /** 如果需要微信授权，但是又没有登陆，需要等待被主动调用 */
      console.error(
        'viewer需要微信授权，请通过 jumpToAuth 方法跳转到微信授权页。'
      );
      return;
    }

    setWechatClientInfo({
      wechatName: decodeURIComponent(getCookie('nickname') || '微信昵称'),
      wxAvatar: decodeURIComponent(getCookie('thumb') || defaultAvatar),
      openId: getCookie('openId') || '',
      unionId: getCookie('unionId') || '',
    } as WechatClientInfo);
  };

  /**
   * 客户端初始化 - 组件挂载时和 isNeedWxAuth 变化时执行
   */
  useEffect(() => {
    clientInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNeedWxAuth]);

  /**
   * 获取微信昵称
   */
  const getNickname = () => {
    if (isNeedWxAuth && !isReady) {
      setNeedAuth(true);
      clientInit();
    }
    return wechatClientInfo?.wechatName;
  };

  /**
   * 获取微信头像
   */
  const getWxAvatarThumb = () => {
    if (isNeedWxAuth && !isReady) {
      setNeedAuth(true);
      clientInit();
    }
    return wechatClientInfo?.wxAvatar;
  };

  /**
   * 获取 OpenID
   */
  const getOpenID = () => {
    if (isNeedWxAuth && !isReady) {
      setNeedAuth(true);
      clientInit();
    }
    return wechatClientInfo?.openId;
  };

  /**
   * 是否已授权
   */
  const getHasAuth = () => {
    return isReady;
  };

  const value = {
    wechatClientInfo,
    isReady,
    isNeedWxAuth,
    setNeedAuth,
    jumpToAuth,
    getNickname,
    getWxAvatarThumb,
    getOpenID,
    getHasAuth,
    showWXAuthPanel,
    setShowWXAuthPanel,
    isWxLogged,
    setIsLogin,
  };

  return value;
};

const WechatInfoContext = createContext<ReturnType<typeof useWxEnv> | null>(
  null
);

interface WechatInfoProviderProps {
  children: ReactNode;
  worksData: IWorksData;
  worksDetail: SerializedWorksEntity;
}

/**
 * 微信信息管理 Provider
 */
export function WechatInfoProvider({
  children,
  worksData,
  worksDetail,
}: WechatInfoProviderProps) {
  const wechatInfo = useWxEnv(worksData, worksDetail);
  return (
    <WechatInfoContext.Provider value={wechatInfo}>
      {children}
      <WxAuthPanel
        jumpToAuth={wechatInfo.jumpToAuth}
        open={wechatInfo.showWXAuthPanel}
        onClose={() => wechatInfo.setShowWXAuthPanel(false)}
      />
    </WechatInfoContext.Provider>
  );
}

/**
 * 使用微信信息 Hook
 * 必须在 WechatInfoProvider 内部使用
 */
export function useWechatInfo() {
  const context = useContext(WechatInfoContext);
  if (!context) {
    // throw new Error('useWechatInfo must be used within WechatInfoProvider');
    return {
      wechatClientInfo: {
        wechatName: '微信昵称',
        wxAvatar: defaultAvatar,
        openId: '',
        unionId: '',
      },
      isReady: false,
      isNeedWxAuth: false,
      setNeedAuth: () => {},
      jumpToAuth: () => {},
    };
  }
  return context;
}
