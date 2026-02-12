import { EventEmitter } from '@/utils';
import React, { createContext, useContext, useRef, useState } from 'react';

interface MusicState {
  playing: boolean;
  playingSrc: string;
  currentMusic: {
    title: string;
    url: string;
    materialId?: string;
    type: string;
    duration: number;
    preview?: string;
  } | null;
}

interface MusicContextType extends MusicState {
  // 播放控制
  togglePlay: (url: string) => Promise<void>;
  pause: () => void;
  stop: () => void;

  // 音乐管理
  setMusic: (music: {
    title: string;
    url: string;
    materialId?: string;
    type: string;
    duration: number;
    preview?: string;
  }) => void;
  closeMusic: () => void;

  // 状态检查
  isPlaying: (url: string) => boolean;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
  children: React.ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [state, setState] = useState<MusicState>({
    playing: false,
    playingSrc: '',
    currentMusic: null,
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  // 切换播放/暂停
  const togglePlay = async (url: string) => {
    if (!audioRef.current) return;

    try {
      if (url !== state.playingSrc) {
        // 播放新的音乐

        // 先暂停当前播放
        audioRef.current.pause();
        // 设置新的音频源
        audioRef.current.src = url;

        // 等待音频加载完成
        await new Promise((resolve, reject) => {
          const audio = audioRef.current!;

          const handleCanPlay = () => {
            audio.removeEventListener('canplaythrough', handleCanPlay);
            audio.removeEventListener('error', handleError);
            resolve(undefined);
          };

          const handleError = (event: Event) => {
            audio.removeEventListener('canplaythrough', handleCanPlay);
            audio.removeEventListener('error', handleError);
            reject(event);
          };

          audio.addEventListener('canplaythrough', handleCanPlay, {
            once: true,
          });
          audio.addEventListener('error', handleError, { once: true });

          // 如果音频已经加载完成，直接解析
          if (audio.readyState >= 3) {
            resolve(undefined);
          }
        });

        EventEmitter.emit('stopMusic', '');
        audioRef.current.volume = 1.0;
        audioRef.current.muted = false;
        await audioRef.current.play();

        setState(prev => ({
          ...prev,
          playingSrc: url,
          playing: true,
        }));
      } else {
        // 切换当前音乐的播放/暂停状态
        if (state.playing) {
          // 如果正在播放，则暂停
          audioRef.current.pause();
          setState(prev => ({
            ...prev,
            playing: false,
          }));
        } else {
          // 如果已暂停，则继续播放
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          await audioRef.current.play();
          setState(prev => ({
            ...prev,
            playing: true,
          }));
        }
      }
    } catch (error) {
      console.error('切换播放状态失败:', error);
    }
  };

  // 暂停音乐
  const pause = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setState(prev => ({
      ...prev,
      playing: false,
    }));
  };

  // 停止音乐
  const stop = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({
      ...prev,
      playing: false,
    }));
  };

  // 设置音乐
  const setMusic = (music: {
    title: string;
    url: string;
    materialId?: string;
    type: string;
    duration: number;
    preview?: string;
  }) => {
    setState(prev => ({
      ...prev,
      currentMusic: music,
      playingSrc: music.url,
      playing: false, // 设置音乐时默认不播放
    }));
  };

  // 关闭音乐
  const closeMusic = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState({
      playing: false,
      playingSrc: '',
      currentMusic: null,
    });
  };

  // 检查是否正在播放指定音乐
  const isPlaying = (url: string) => {
    return state.playing && state.playingSrc === url;
  };

  // 处理播放事件
  const handlePlay = () => {
    setState(prev => ({
      ...prev,
      playing: true,
    }));
  };

  // 处理暂停事件
  const handlePause = () => {
    setState(prev => ({
      ...prev,
      playing: false,
    }));
  };

  // 处理错误事件
  const handleError = (error: any) => {
    console.error('音乐播放错误:', error);
    setState(prev => ({
      ...prev,
      playing: false,
    }));
  };

  const contextValue: MusicContextType = {
    ...state,
    togglePlay,
    pause,
    stop,
    setMusic,
    closeMusic,
    isPlaying,
  };

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
      <audio
        ref={audioRef}
        loop
        preload='auto'
        autoPlay={false}
        style={{ display: 'none' }}
        controls={false}
        muted={false}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
      />
    </MusicContext.Provider>
  );
};

// 自定义 Hook 来使用 MusicContext
export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
