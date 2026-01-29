import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import clas from 'classnames';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

const PreloadPageDiv = styled.div`
  background: white;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100dvh;
  height: 100vh;
  z-index: 999;
  transition: all ease 0.3s;
  opacity: 1;
  visibility: visible;

  &.fade-out {
    opacity: 0;
    visibility: hidden;
  }

  .text {
    position: absolute;
    top: calc(30% + 126px);
    left: 50%;
    transform: translate(-50%, 0);
    font-family: PingFang SC;
    font-weight: 400;
    font-size: 14px;
    line-height: 22px;
    letter-spacing: 0px;
    text-align: center;
    color: rgba(0, 0, 0, 0.6);
  }

  .html_loading_area {
    position: absolute;
    width: 110px;
    height: 110px;
    top: 30%;
    left: 50%;
    margin-left: -55px;
    transition: all ease 0.3s;
    border-radius: 50%;
    overflow: hidden;
    transform: rotate(0deg);
    -webkit-transform: rotate(0deg);
    isolation: isolate;

    .thumb_container {
      transition: all ease 0.3s;
      mask-size: cover;
      mask-image: url(https://res.maka.im/cdn/webstore10/jiantie/wave2.png?x-oss-process=image/format,webp);
      mask-repeat: no-repeat;
      mask-position: 77% 0px;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: #f1f1f1;
      animation: wave1 2s linear;
    }
    .wave {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      height: 100%;
      width: 200%;
      animation: wave2 2s linear;
      background-image: url('https://res.maka.im/cdn/webstore10/jiantie/wave2.png?x-oss-process=image/format,webp');
      background-size: cover;
      background-repeat: repeat-x;
      z-index: 1;
      opacity: 0;
    }

    .thumb-img {
      position: absolute;
      height: 106px;
      width: 106px;
      object-fit: cover;
      border-radius: 84px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 999;
      overflow: hidden;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &.end {
      .thumb_container {
        mask-image: none;
      }
      .wave {
        opacity: 0;
      }
    }

    @keyframes wave1 {
      0% {
        mask-position: 7% 110px;
      }
      100% {
        mask-position: 77% 0px;
      }
    }
    @keyframes wave2 {
      0% {
        background-position: 4% 110px;
        opacity: 1;
      }
      100% {
        background-position: 104% 0px;
        opacity: 0;
      }
    }
  }

  &.jiantie {
    background-image: url('https://res.maka.im/cdn/webstore10/jiantie/preload_bg.png?x-oss-process=image/format,webp');
    background-size: 100% auto;
    background-position: 0 0;
    background-repeat: no-repeat;

    .html_loading_area {
      top: 170px;
    }
    .text {
      top: 292px;
    }
  }
`;

const LogoDiv = styled.div`
  position: absolute;
  bottom: 10px;
  font-size: 12px;
  color: gray;
  text-align: center;
  width: 100%;

  img {
    height: 36px;
    opacity: 0.8;
    margin: 0 auto;
  }
`;

const BrandDiv = styled.div`
  position: absolute;
  bottom: 48px;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .logo {
    max-height: 24px;
    width: auto;
  }
  .brandText {
    margin-top: 16px;
    font-family: Alimama FangYuanTi VF;
    font-weight: 600;
    font-size: 12px;
    line-height: 18px;
    letter-spacing: 0px;
    vertical-align: middle;
    color: #020617;
  }
`;

interface Props {
  // 作品基础信息
  worksCover: string;
  worksId: string;

  // 应用配置
  appid?: string;
  userAgent: string;

  needLoading?: boolean;

  // 权限配置
  removeProductIdentifiers?: boolean;
  customLogo?: boolean;

  // 品牌信息
  brandLogoUrl?: string;
  brandText?: string;

  // 回调
  loadEndCb?: () => void;
}

export type PreloadPageHandle = {
  terminate: () => Promise<unknown>;
};

const slogan: Record<string, string> = {
  jiantie: '重要时刻，简帖创作',
};

/**
 * PreloadPage 转为函数组件实现，保持原有业务逻辑不变
 */
const PreloadPage = forwardRef<PreloadPageHandle, Props>((props, ref) => {
  const {
    worksCover,
    worksId,
    appid = 'jiantie',
    userAgent,
    needLoading = true,
    removeProductIdentifiers = false,
    customLogo = false,
    brandLogoUrl = false,
    brandText,
    loadEndCb,
  } = props;

  /** 是否展示预加载页 */
  const needShowInit = useMemo(() => {
    return needLoading && !/MAKAInternal/.test(userAgent);
  }, [userAgent, needLoading]);

  // 使用 useState 和 useEffect 确保服务器端和客户端渲染一致
  // 服务器端始终为 false，客户端挂载后再根据条件决定
  const [needShow, setNeedShow] = useState<boolean>(false);
  const [hasLoadEnd, setHasLoadEnd] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // 客户端挂载后，根据条件设置 needShow
  useEffect(() => {
    setMounted(true);
    if (needShowInit) {
      setNeedShow(true);
    }
  }, [needShowInit]);

  /** 封面 url */
  const thumbUrl = useMemo(
    () =>
      cdnApi(worksCover, {
        format: 'webp',
        resizeWidth: 300,
      }),
    [worksCover]
  );

  /** 获取缩放样式 (每次渲染时计算，行为与 class getter 保持一致) */
  const scale = 1;
  const scaleStyle: React.CSSProperties = {
    transformOrigin: '0 0',
    zoom: scale === 1 ? 1 : 2 * scale,
  };

  /** 获取 logo url */
  const logoUrl = useMemo(() => {
    if (appid === 'gov') {
      return cdnApi('/cdn/webstore7/assets/app/common/gov_loading_logo2.png');
    } else if (appid === 'preschool') {
      return cdnApi(
        '/cdn/webstore7/assets/app/common/preschool_loading_logo.png'
      );
    } else if (appid === 'education') {
      return cdnApi(
        '/cdn/webstore7/assets/app/common/education_loading_logo.png'
      );
    } else if (appid === 'jiantie') {
      return cdnApi(
        '/cdn/webstore7/assets/app/common/jiantie_loading_logo_2.png'
      );
    } else if (appid === 'makaai') {
      return cdnApi(
        '/cdn/webstore7/assets/app/common/jiantie_loading_logo_2.png'
      );
    } else if (appid === 'xueji') {
      return cdnApi('/cdn/webstore10/xueji/xueji_loading_logo.png');
    } else if (appid === 'huiyao') {
      return cdnApi('/cdn/webstore10/huiyao/loading_logo.png');
    }
    return cdnApi('/assets/viewer-loading-logo.png');
  }, [appid]);

  /** mask 图片 */
  const maskImage = useMemo(() => {
    if (appid === 'xueji') {
      return 'https://res.maka.im/cdn/webstore10/xueji/wave2.png?x-oss-process=image/format,webp';
    }
    if (appid === 'huiyao') {
      return 'https://res.maka.im/cdn/webstore10/huiyao/wave2.png?x-oss-process=image/format,webp';
    }
    return 'https://res.maka.im/cdn/webstore10/jiantie/wave2.png?x-oss-process=image/format,webp';
  }, [appid]);

  /** 禁用/启用 body 滚动和触摸事件 */
  useEffect(() => {
    if (needShow) {
      // 保存原始样式
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      // 禁用滚动和触摸
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      // 清理函数：恢复原始样式
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [needShow]);

  /** 组件挂载后逻辑 */
  useEffect(() => {
    if (needShow) {
      // 长页在 2 秒后自动结束加载动画
      const timer = setTimeout(() => {
        loadEndCb?.();
        setHasLoadEnd(true);
        // 再多等待 200ms，保证渐隐动画播放
        setTimeout(() => setNeedShow(false), 200);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loadEndCb, needShow, worksId]);

  /** 提供给外部的 terminate 方法 */
  const terminate = useCallback(() => {
    return new Promise<unknown>(resolve => {
      setHasLoadEnd(true);
      loadEndCb?.();
      setTimeout(() => {
        setNeedShow(false);
        resolve(1);
      }, 300);
    });
  }, [loadEndCb]);

  // 暴露实例方法给父组件
  useImperativeHandle(ref, () => ({ terminate }), [terminate]);

  // 服务器端或未挂载时不渲染，避免 hydration 错误
  if (!mounted || !needShow) {
    return <></>;
  }

  return (
    <PreloadPageDiv
      style={scaleStyle}
      className={clas([hasLoadEnd && 'fade-out', appid])}
    >
      <div className={clas(['html_loading_area', hasLoadEnd && 'end'])}>
        <div
          className='wave'
          style={{ backgroundImage: `url(${maskImage})` }}
        ></div>
        <div
          className='thumb_container'
          style={{ maskImage: `url(${maskImage})` }}
        >
          <div className='thumb-img'>
            {thumbUrl && <img src={thumbUrl} alt='thumb' />}
          </div>
        </div>
      </div>
      <div className='text'>{slogan[appid] || '加载中'}</div>

      {appid !== 'jiantie' && !removeProductIdentifiers && (
        <LogoDiv>
          <img src={logoUrl} alt='logo' />
        </LogoDiv>
      )}

      {appid === 'jiantie' && (
        <BrandDiv>
          <img
            src={
              customLogo && brandLogoUrl
                ? brandLogoUrl
                : 'https://res.maka.im/cdn/webstore10/jiantie/preload_logo_3x.png?x-oss-process=image/format,webp'
            }
            alt='logo'
            className='logo'
          />

          {customLogo && brandText ? (
            brandText && <div className='brandText'>{brandText}</div>
          ) : (
            <div className='brandText'>请柬丨贺卡丨相册丨MV视频</div>
          )}
        </BrandDiv>
      )}
    </PreloadPageDiv>
  );
});

PreloadPage.displayName = 'PreloadPage';

export default PreloadPage;
