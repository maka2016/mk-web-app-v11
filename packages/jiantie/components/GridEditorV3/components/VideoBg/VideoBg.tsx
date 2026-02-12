import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import { useEffect, useRef } from 'react';
import { VideoBgConfig } from './types';

const VideoContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
`;

interface VideoBgProps {
  id?: string;
  config: VideoBgConfig;
  wrapper?: (children: React.ReactNode) => React.ReactNode;
  propsForVideo?: React.VideoHTMLAttributes<HTMLVideoElement>;
  style?: React.CSSProperties;
}

export default function VideoBg({
  id,
  config,
  wrapper,
  style,
  propsForVideo = {},
}: VideoBgProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    function playVideoInWeChat() {
      const video = videoRef.current;
      if (!video) return;

      if (window.WeixinJSBridge) {
        (window as any).WeixinJSBridge.invoke(
          'getNetworkType',
          {},
          function () {
            // res.err_msg 可能是 "network_type:wifi" / "network_type:4g" 等
            // 可以根据网络类型决定是否播放
            video.muted = true; // 静音
            const playPromise = video.play();
            if (playPromise && playPromise.catch) {
              playPromise.catch(err => {
                // 播放失败时（可能被禁止），可以提示用户点击播放
                console.warn('自动播放失败', err);
              });
            }
          }
        );
      } else {
        // fallback
        video.play().catch(err => {
          console.warn('播放失败', err);
        });
      }
    }
    playVideoInWeChat();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 设置视频属性
    video.crossOrigin = 'anonymous';
    video.muted = config.muted !== false;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true');
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-player-fullscreen', 'false');
    video.loop = config.loop !== false;
    video.preload = 'auto';

    // 尝试自动播放
    const playVideo = async () => {
      try {
        if (!hasPlayedRef.current) {
          await video.play();
          hasPlayedRef.current = true;
        }
      } catch (error) {
        // 自动播放失败，等待用户交互
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[VideoBg] Autoplay failed:', error);
        }
      }
    };

    // 检测是否为微信环境
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    // 用户交互处理（微信需要用户点击才能播放）
    const handleInteraction = () => {
      void playVideo();
    };

    // 微信环境：添加点击事件监听
    if (isWeChat) {
      // 允许视频元素接收点击事件

      document.addEventListener('touchstart', handleInteraction, {
        once: true,
        passive: true,
      });
      document.addEventListener('click', handleInteraction, {
        once: true,
        passive: true,
      });

      return () => {
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('click', handleInteraction);
      };
    } else {
      // 非微信环境：尝试自动播放
      void playVideo();
    }
  }, [config.muted, config.loop]);

  // 检测是否为 Safari 浏览器（包括 macOS 和 iOS）
  const isSafari = (): boolean => {
    const ua = navigator.userAgent;
    // Safari 检测：包含 Safari 但不包含 Chrome（Chrome 的 UA 也包含 Safari）
    return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
  };

  // 检测是否为 iOS 设备
  const isIOSDevice = (): boolean => {
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua);
  };

  // 根据浏览器支持选择视频格式
  const getVideoUrl = (): string | null => {
    // 判断是否需要透明通道：如果有 mp4VideoUrl 且没有 movVideoUrl 和 webmVideoUrl，则是非透明通道模式
    const hasAlphaVideos = !!(config.movVideoUrl || config.webmVideoUrl);
    const hasMp4Only = !!config.mp4VideoUrl && !hasAlphaVideos;

    // 如果是非透明通道模式（只有 MP4），直接使用 MP4
    if (hasMp4Only) {
      return config.mp4VideoUrl!;
    }

    // 透明通道模式：需要根据浏览器选择 MOV 或 WebM
    if (!hasAlphaVideos) {
      // 如果没有透明通道视频，尝试使用 webm 作为兜底
      if (config.webmVideoUrl) {
        return config.webmVideoUrl;
      }
      return null;
    }

    const isSafariBrowser = isSafari();
    const isIOS = isIOSDevice();

    // Safari 或 iOS：优先使用 MOV（MOV 在 Safari/iOS 上支持更好，特别是透明通道）
    if (isSafariBrowser || isIOS) {
      if (config.movVideoUrl) {
        return config.movVideoUrl;
      }
      // 如果没有 MOV，尝试使用 WebM（Safari 14.1+ 支持）
      if (config.webmVideoUrl) {
        return config.webmVideoUrl;
      }
    } else {
      // 非 Safari/iOS：优先使用 WebM（WebM 在 Chrome/Firefox/Edge 上支持更好，特别是透明通道）
      if (config.webmVideoUrl) {
        return config.webmVideoUrl;
      }
      // 如果没有 WebM，尝试使用 MOV
      if (config.movVideoUrl) {
        return config.movVideoUrl;
      }
    }

    // 兜底方案：如果所有匹配都失败，尝试使用 webm
    if (config.webmVideoUrl) {
      return config.webmVideoUrl;
    }

    if ((config as any).videoUrl) {
      // 旧数据
      return (config as any).videoUrl;
    }

    // 如果全部配置都没有，返回 null
    return null;
  };

  const videoUrl = getVideoUrl();
  if (!videoUrl) return null;

  const videoDOM = (
    <StyledVideo
      ref={videoRef}
      src={cdnApi(videoUrl)}
      poster={config.posterUrl ? cdnApi(config.posterUrl) : undefined}
      loop={config.loop !== false}
      muted={config.muted !== false}
      playsInline={true}
      autoPlay
      preload='auto'
      crossOrigin='anonymous'
      {...propsForVideo}
      style={{
        ...style,
        objectFit: config.objectFit || 'cover',
        opacity: config.opacity ?? 1,
      }}
    />
  );

  return wrapper ? (
    wrapper(videoDOM)
  ) : (
    <VideoContainer title='video-bg-container'>{videoDOM}</VideoContainer>
  );
}
