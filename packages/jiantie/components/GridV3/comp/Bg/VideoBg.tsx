import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { VideoBgConfig } from '../../../Envelope/types';

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

    // 尝试自动播放
    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.warn('视频自动播放失败:', error);
      }
    };

    playVideo();
  }, [config.videoUrl]);

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
        preload="metadata"
        style={{
          objectFit: config.objectFit || 'cover',
          opacity: config.opacity ?? 1,
        }}
      />
    </VideoContainer>
  );
}
