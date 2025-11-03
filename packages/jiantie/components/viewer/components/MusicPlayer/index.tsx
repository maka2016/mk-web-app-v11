import { cdnApi } from '@mk/services';
import { EventEmitter, isAndroid, isWechat } from '@mk/utils';
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
    // const handlevisibilitychange = () => {
    //   if (document.visibilityState === "hidden") {
    //     if (soundRef.current) {
    //       playing.current = !!soundRef.current?.playing()
    //     }
    //     if (audioRef.current) {
    //       playing.current = !audioRef.current?.paused
    //     }
    //     soundRef.current?.pause()
    //     audioRef.current?.pause()

    //   } else if (document.visibilityState === "visible" && playing.current) {
    //     soundRef.current?.play()
    //     audioRef.current?.play()
    //   }
    // }

    const handlePause = () => {
      playing.current =
        soundRef.current?.playing() || !audioRef.current?.paused;
      soundRef.current?.pause();
      audioRef.current?.pause();
      setbgPlaying(false);
    };

    const handleResume = () => {
      if (playing.current) {
        soundRef.current?.play();
        audioRef.current?.play();
        setbgPlaying(true);
      }
    };

    const handlevisibilitychange = () => {
      if (document.visibilityState === 'hidden') handlePause();
      else handleResume();
    };

    window.addEventListener('pagehide', handlePause);
    window.addEventListener('pageshow', handleResume);

    EventEmitter.on('openMusic', trigPlay);
    EventEmitter.on('stopMusic', stopMusic);
    EventEmitter.on('resumeMusic', resumeMusic);
    document.addEventListener('touchstart', trigPlay);
    document.addEventListener('mousedown', trigPlay);
    document.addEventListener('visibilitychange', handlevisibilitychange);

    return () => {
      EventEmitter.rm('openMusic', trigPlay);
      EventEmitter.rm('stopMusic', stopMusic);
      EventEmitter.rm('resumeMusic', resumeMusic);
      document.removeEventListener('touchstart', trigPlay);
      document.removeEventListener('mousedown', trigPlay);
      document.removeEventListener('visibilitychange', handlevisibilitychange);
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
          className={`musicIcon ${bgPlaying ? 'runAnimation' : 'stopAnimation'}`}
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
