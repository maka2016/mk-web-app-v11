import styled from '@emotion/styled';
import { useEffect, useRef } from 'react';
import { VideoBgConfig } from '../VideoBg/types';

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
`;

interface VideoBgProps {
  config: VideoBgConfig;
}

export default function VideoBg({ config }: VideoBgProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = config.muted !== false;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true');
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x-webkit-airplay', 'allow');

    // 尝试自动播放
    const playVideo = async () => {
      if (!video.paused) return;
      try {
        await video.play();
      } catch (error) {
        // WeChat 环境需要用户交互后触发
        if (process.env.NODE_ENV !== 'production') {
          console.warn('视频自动播放失败:', error);
        }
      }
    };

    const handleTouchInteraction: EventListener = () => {
      void playVideo();
    };

    const handleWeixinBridgeReady: EventListener = () => {
      void playVideo();
    };

    void playVideo();

    document.addEventListener('touchstart', handleTouchInteraction, {
      passive: true,
    });
    document.addEventListener('click', handleTouchInteraction, {
      passive: true,
    });
    document.addEventListener(
      'WeixinJSBridgeReady',
      handleWeixinBridgeReady as EventListener
    );

    return () => {
      document.removeEventListener('touchstart', handleTouchInteraction);
      document.removeEventListener('click', handleTouchInteraction);
      document.removeEventListener(
        'WeixinJSBridgeReady',
        handleWeixinBridgeReady as EventListener
      );
    };
  }, [config.videoUrl, config.muted]);

  if (!config.videoUrl) return null;

  return (
    <VideoContainer>
      <StyledVideo
        ref={videoRef}
        src={config.videoUrl}
        loop={config.loop !== false}
        muted={config.muted !== false}
        playsInline
        autoPlay
        preload='metadata'
        style={{
          objectFit: config.objectFit || 'cover',
          opacity: config.opacity ?? 1,
        }}
      />
    </VideoContainer>
  );
}
