import { cdnApi } from '@/services';
import { EventEmitter, isAndroid, isWechat } from '@/utils';
import { Howl } from 'howler';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  musicData: Record<string, any>;
  visible: boolean;
}

const actionUrl = (src: string) => {
  let url = src.replace('immaterialstore', 'im/materialStore');
  url = url.replace('materialstore', 'materialStore');
  if (url.includes('http')) {
    url = url.slice(url.indexOf('http'));
  }
  if (url.includes('http') && !url.includes('https')) {
    url = url.replace('http', 'https');
  }
  if (!url.includes('https://')) {
    url = url.replace('https:', 'https://');
  }
  return url;
};

const MusicPlayer: React.FC<Props> = (props: Props) => {
  const { visible } = props;
  const src = props?.musicData?.url ? cdnApi(props.musicData.url) : '';
  const soundRef = useRef<Howl>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);
  const [bgPlaying, setbgPlaying] = useState(false);
  const playing = useRef(false);

  const hasInitialized = useRef(false);

  // howler 初始化
  useEffect(() => {
    const androidWechat = isAndroid() && isWechat();
    if (!androidWechat) return;
    soundRef.current = new Howl({
      src: [src],
      autoplay: true,
      loop: true,
      html5: false,
      preload: true,
      mute: false,
      volume: 0.5,
    });

    soundRef.current.once('load', () => {
      bindWeChatEvents();
    });

    soundRef.current.on('play', () => {
      setbgPlaying(true);
    });

    soundRef.current.on('end', () => {
      setbgPlaying(false);
    });

    soundRef.current.on('pause', () => {
      setbgPlaying(false);
    });

    soundRef.current.on('stop', () => {
      setbgPlaying(false);
    });

    const bindWeChatEvents = () => {
      const { WeixinJSBridge } = window as any;
      if (
        typeof WeixinJSBridge == 'object' &&
        typeof WeixinJSBridge.invoke == 'function'
      ) {
        WeixinJSBridge?.invoke?.('getNetworkType', {}, trigPlay, false);
      } else {
        document.addEventListener(
          'WeixinJSBridgeReady',
          function () {
            if (
              typeof WeixinJSBridge == 'object' &&
              typeof WeixinJSBridge.invoke == 'function'
            ) {
              WeixinJSBridge?.invoke?.('getNetworkType', {}, trigPlay);
            }
          },
          false
        );
      }
    };

    return () => {
      soundRef.current?.off('play');
      soundRef.current?.off('pause');
      soundRef.current?.off('stop');
      soundRef.current?.off('end');
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isWechat()) {
      const { WeixinJSBridge } = window as any;
      if (
        typeof WeixinJSBridge == 'object' &&
        typeof WeixinJSBridge.invoke == 'function'
      ) {
        WeixinJSBridge?.invoke?.('getNetworkType', {}, trigPlay, false);
      } else {
        document.addEventListener(
          'WeixinJSBridgeReady',
          function () {
            if (
              typeof WeixinJSBridge == 'object' &&
              typeof WeixinJSBridge.invoke == 'function'
            ) {
              WeixinJSBridge?.invoke?.('getNetworkType', {}, trigPlay);
            }
          },
          false
        );
      }
    } else {
      trigPlay();
    }
    setTimeout(() => {
      setbgPlaying(!audioRef.current?.paused);
    }, 200);
  }, [audioRef]);

  useEffect(() => {
    setTimeout(() => {
      if (!audioRef.current?.paused) {
        setbgPlaying(true);
        setReady(true);
        hasInitialized.current = true;
      }
    }, 1000);
  }, [props?.musicData?.url]);

  useEffect(() => {
    if (!soundRef.current && !audioRef.current) return;

    // 处理页面隐藏/失去焦点时暂停音乐
    const handlePause = () => {
      // 记录当前播放状态
      if (soundRef.current) {
        playing.current = soundRef.current.playing();
      }
      if (audioRef.current) {
        playing.current = playing.current || !audioRef.current.paused;
      }
      // 暂停播放
      soundRef.current?.pause();
      audioRef.current?.pause();
      setbgPlaying(false);
    };

    // 处理页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时暂停
        handlePause();
      }
      // 页面重新可见时不自动恢复播放，保持暂停状态
    };

    // 处理窗口失去焦点
    const handleBlur = () => {
      handlePause();
    };

    // 处理页面隐藏（移动端）
    const handlePageHide = () => {
      handlePause();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    EventEmitter.on('openMusic', trigPlay);
    EventEmitter.on('stopMusic', stopMusic);
    EventEmitter.on('resumeMusic', resumeMusic);
    document.addEventListener('touchstart', trigPlay);
    document.addEventListener('mousedown', trigPlay);

    return () => {
      EventEmitter.rm('openMusic', trigPlay);
      EventEmitter.rm('stopMusic', stopMusic);
      EventEmitter.rm('resumeMusic', resumeMusic);
      document.removeEventListener('touchstart', trigPlay);
      document.removeEventListener('mousedown', trigPlay);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      soundRef.current?.unload();
    };
  }, [audioRef, soundRef]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'STOP_MUSIC') {
        stopMusic();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const hasBg = () => {
    return !!props?.musicData?.url;
  };

  const freshPlayingState = () => {
    setTimeout(() => {
      if (audioRef?.current?.paused) {
        setbgPlaying(false);
      } else {
        setbgPlaying(true);
      }
    }, 200);
  };

  const trigPlay = () => {
    if (hasInitialized.current) return;
    if (!props?.musicData?.url) return;
    console.log('trigger play');
    if (soundRef.current) {
      if (!soundRef.current.playing()) {
        soundRef.current.play();
      }
      hasInitialized.current = true;
      setReady(true);
    }

    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      }

      setTimeout(() => {
        if (!audioRef?.current?.paused) {
          hasInitialized.current = true;
        }
      }, 200);
      freshPlayingState();
      setReady(true);
    }
  };

  const stopMusic = () => {
    soundRef.current?.pause();
    audioRef.current?.pause();
    setbgPlaying(false);
  };

  const resumeMusic = () => {
    soundRef.current?.play();
    audioRef.current?.play();
    setbgPlaying(true);
  };

  const toogleBgMusic = () => {
    if (!ready) return;
    if (!bgPlaying) {
      audioRef.current?.play();
      soundRef.current?.play();
    } else {
      soundRef.current?.pause();
      audioRef.current?.pause();
    }
    setbgPlaying(!bgPlaying);
  };

  const musicIcon = () => {
    if (hasBg() && visible)
      return (
        <div
          className={`w-[40px] h-[40px] musicIcon ${bgPlaying ? 'runAnimation animate-spin animate-infinite [animation-duration:_2s]' : 'stopAnimation'}`}
          onClick={toogleBgMusic}
        >
          <img
            src='https://res.maka.im/cdn/maka/release/music_icon.png'
            alt=''
          />
        </div>
      );
    else return null;
  };

  const audio = () => {
    if (isAndroid() && isWechat()) {
      return;
    }
    if (hasBg() && visible) {
      return (
        <audio
          loop
          ref={audioRef}
          src={actionUrl(src)}
          preload='auto'
          autoPlay={true}
        ></audio>
      );
    }
    return null;
  };

  return (
    <div>
      {musicIcon()}
      {audio()}
    </div>
  );
};

export default MusicPlayer;
