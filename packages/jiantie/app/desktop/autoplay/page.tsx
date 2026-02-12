'use client';

import { useEffect, useState } from 'react';

// 扩展 Window 接口以支持微信 JSBridge
declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        method: string,
        params: any,
        callback?: (res: any) => void
      ) => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

export default function AutoplayTestPage() {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isWeixin, setIsWeixin] = useState(false);
  const [weixinReady, setWeixinReady] = useState(false);

  // 播放所有视频
  const playAllVideos = () => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.play().catch(err => {
        console.log('视频播放失败:', err);
      });
    });
  };

  // 检测是否在微信浏览器中
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWx = ua.includes('micromessenger');
    setIsWeixin(isWx);

    if (isWx) {
      // 微信浏览器：监听 WeixinJSBridgeReady 事件
      if (typeof window.WeixinJSBridge !== 'undefined') {
        playAllVideos();
        setWeixinReady(true);
      } else {
        document.addEventListener(
          'WeixinJSBridgeReady',
          () => {
            playAllVideos();
            setWeixinReady(true);
          },
          false
        );
      }

      // 监听用户首次交互（touchstart 或 click）
      const handleFirstInteraction = () => {
        playAllVideos();
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
      };

      document.addEventListener('touchstart', handleFirstInteraction, {
        once: true,
      });
      document.addEventListener('click', handleFirstInteraction, {
        once: true,
      });
    }
  }, []);

  const handlePlayPause = (videoId: string) => {
    const video = document.getElementById(videoId) as HTMLVideoElement;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = (videoId: string) => {
    const video = document.getElementById(videoId) as HTMLVideoElement;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* Header */}
      <div className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          <h1 className='text-3xl font-bold text-gray-900'>
            视频背景自动播放测试页面
          </h1>
          <p className='mt-2 text-gray-600'>测试不同场景下的视频自动播放功能</p>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 py-8 space-y-8'>
        {/* 微信浏览器状态提示 */}
        {isWeixin && (
          <section className='bg-green-50 border-2 border-green-200 rounded-lg p-6'>
            <div className='flex items-start space-x-3'>
              <span className='text-2xl'>✅</span>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-green-900 mb-2'>
                  微信浏览器检测成功
                </h2>
                <div className='space-y-2 text-sm text-green-800'>
                  <p>✓ 已启用微信浏览器自动播放优化</p>
                  <p>
                    ✓ WeixinJSBridge 状态:{' '}
                    <span className='font-semibold'>
                      {weixinReady ? '已就绪' : '等待中...'}
                    </span>
                  </p>
                  <p className='pt-2 border-t border-green-200'>
                    💡 提示：如果视频未自动播放，请
                    <strong>点击或触摸屏幕任意位置</strong>来触发播放
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 测试 5: 微信专用测试 */}
        <section className='bg-white rounded-lg shadow-md overflow-hidden'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900'>
              测试 5: 微信浏览器专用优化
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              使用 WeixinJSBridge + 触摸事件触发自动播放
            </p>
          </div>
          <div className='relative h-96 bg-gradient-to-br from-green-500 to-emerald-500'>
            <video
              id='weixinVideo'
              className='w-full h-full object-cover'
              muted
              loop
              playsInline
              webkit-playsinline='true'
              x5-video-player-type='h5'
              x5-video-player-fullscreen='false'
              x5-playsinline='true'
            >
              <source
                src='https://makapicture.oss-accelerate.aliyuncs.com/cdn/test/5532771-uhd_2160_4096_25fps.mp4'
                type='video/mp4'
              />
            </video>
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
              <div className='bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-xl max-w-md'>
                <h3 className='text-xl font-bold text-gray-900 mb-2'>
                  {isWeixin ? '微信浏览器环境' : '非微信浏览器'}
                </h3>
                <p className='text-sm text-gray-700'>
                  {isWeixin
                    ? '已自动配置微信专属属性（x5-video-player-type, x5-playsinline）'
                    : '在微信中打开此页面以测试微信专属优化'}
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Test Case 1: 基础自动播放 */}
        <section className='bg-white rounded-lg shadow-md overflow-hidden'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900'>
              测试 1: 基础自动播放 (静音 + 循环)
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              自动播放、静音、循环播放
            </p>
          </div>
          <div className='relative h-96 bg-black'>
            <video
              id='video1'
              className='w-full h-full object-cover'
              autoPlay
              muted
              loop
              playsInline
            >
              <source
                src='https://makapicture.oss-accelerate.aliyuncs.com/cdn/test/5532771-uhd_2160_4096_25fps.mp4'
                type='video/mp4'
              />
              您的浏览器不支持视频标签
            </video>
            <div className='absolute bottom-4 left-4 space-x-2'>
              <button
                onClick={() => handlePlayPause('video1')}
                className='px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-md'
              >
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={() => toggleMute('video1')}
                className='px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-md'
              >
                {isMuted ? '取消静音' : '静音'}
              </button>
            </div>
          </div>
        </section>

        {/* Test Case 2: 全屏背景视频 */}
        <section className='bg-white rounded-lg shadow-md overflow-hidden'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900'>
              测试 2: 全屏背景视频
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              视频作为背景，上层有内容覆盖
            </p>
          </div>
          <div className='relative h-96 overflow-hidden'>
            <video
              className='absolute inset-0 w-full h-full object-cover'
              autoPlay
              muted
              loop
              playsInline
            >
              <source
                src='https://makapicture.oss-accelerate.aliyuncs.com/cdn/test/5532771-uhd_2160_4096_25fps.mp4'
                type='video/mp4'
              />
            </video>
            <div className='relative z-10 h-full flex items-center justify-center'>
              <div className='bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl max-w-md'>
                <h3 className='text-2xl font-bold text-gray-900 mb-4'>
                  覆盖内容
                </h3>
                <p className='text-gray-700'>
                  这是一个示例，展示如何在视频背景上添加内容。视频会在背景中自动播放，而这个卡片会显示在上层。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Test Case 3: 移动端优化 */}
        <section className='bg-white rounded-lg shadow-md overflow-hidden'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900'>
              测试 3: 移动端优化 (playsInline)
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              添加 playsInline 属性以支持 iOS Safari
            </p>
          </div>
          <div className='relative h-96 bg-gradient-to-br from-purple-500 to-pink-500'>
            <video
              id='video3'
              className='w-full h-full object-cover opacity-75'
              autoPlay
              muted
              loop
              playsInline
              webkit-playsinline='true'
            >
              <source
                src='https://makapicture.oss-accelerate.aliyuncs.com/cdn/test/5532771-uhd_2160_4096_25fps.mp4'
                type='video/mp4'
              />
            </video>
          </div>
        </section>

        {/* Test Case 4: 多个视频网格 */}
        <section className='bg-white rounded-lg shadow-md overflow-hidden'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900'>
              测试 4: 多个视频同时播放
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              测试多个视频背景同时自动播放的性能
            </p>
          </div>
          <div className='p-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
            {[1, 2, 3, 4].map(index => (
              <div
                key={index}
                className='relative h-64 rounded-lg overflow-hidden'
              >
                <video
                  className='w-full h-full object-cover'
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source
                    src='https://makapicture.oss-accelerate.aliyuncs.com/cdn/test/5532771-uhd_2160_4096_25fps.mp4'
                    type='video/mp4'
                  />
                </video>
                <div className='absolute top-2 left-2 bg-black/50 text-white px-3 py-1 rounded-md text-sm'>
                  视频 {index}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 浏览器支持信息 */}
        <section className='bg-blue-50 rounded-lg p-6'>
          <h2 className='text-lg font-semibold text-blue-900 mb-3'>
            📋 自动播放最佳实践
          </h2>
          <ul className='space-y-2 text-sm text-blue-800'>
            <li className='flex items-start'>
              <span className='mr-2'>✓</span>
              <span>
                <strong>autoPlay</strong> - 页面加载时自动播放视频
              </span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>✓</span>
              <span>
                <strong>muted</strong> -
                必须静音才能自动播放（大多数浏览器要求）
              </span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>✓</span>
              <span>
                <strong>loop</strong> - 视频结束后自动重新播放
              </span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>✓</span>
              <span>
                <strong>playsInline</strong> - iOS Safari 需要此属性才能内联播放
              </span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>⚠️</span>
              <span>
                移动端网络环境可能会阻止自动播放，建议提供用户交互触发播放
              </span>
            </li>
          </ul>
        </section>

        {/* 微信浏览器专项说明 */}
        <section className='bg-amber-50 rounded-lg p-6'>
          <h2 className='text-lg font-semibold text-amber-900 mb-3'>
            🔧 微信浏览器专项优化
          </h2>
          <div className='space-y-3 text-sm text-amber-800'>
            <div>
              <h3 className='font-semibold mb-1'>1. WeixinJSBridge 方案</h3>
              <p className='ml-4'>
                监听{' '}
                <code className='bg-amber-100 px-1 rounded'>
                  WeixinJSBridgeReady
                </code>{' '}
                事件，在微信 JS-SDK 就绪后触发视频播放
              </p>
            </div>
            <div>
              <h3 className='font-semibold mb-1'>2. 用户交互触发</h3>
              <p className='ml-4'>
                监听首次 touchstart/click 事件，用户交互后立即播放所有视频
              </p>
            </div>
            <div>
              <h3 className='font-semibold mb-1'>3. 腾讯 X5 内核属性</h3>
              <p className='ml-4'>
                添加{' '}
                <code className='bg-amber-100 px-1 rounded'>
                  x5-video-player-type=&quot;h5&quot;
                </code>{' '}
                和{' '}
                <code className='bg-amber-100 px-1 rounded'>
                  x5-playsinline=&quot;true&quot;
                </code>{' '}
                属性支持 Android 微信
              </p>
            </div>
            <div className='pt-2 border-t border-amber-200'>
              <p className='font-semibold'>💡 实现原理：</p>
              <p className='ml-4 mt-1'>
                本页面已自动集成以上三种方案，当检测到微信环境时会自动启用。如果视频未自动播放，请触摸屏幕任意位置来激活播放。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
