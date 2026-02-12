/**
 * 服务端渲染的信封 Loading 组件
 * 显示信封的初始状态，客户端接管后播放动画
 */
import { EnvelopeConfig } from './types';

interface EnvelopeLoadingProps {
  config?: EnvelopeConfig;
}

export function EnvelopeLoading({ config }: EnvelopeLoadingProps) {
  if (!config || !config.backgroundImage) {
    console.log('[EnvelopeLoading SSR] 无信封配置，跳过渲染');
    return null;
  }

  console.log('[EnvelopeLoading SSR] 正在渲染静态信封');

  return (
    <div
      id='envelope-loading'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 背景层 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${config.backgroundImage})`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          backgroundPosition: 'center',
        }}
      />

      {/* 信封层 - 竖版（服务端渲染，使用固定尺寸，客户端会接管） */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vw',
          aspectRatio: '114 / 162',
        }}
      >
        {/* 信封左开口外侧图 */}
        {config.leftFlapOuterImage && (
          <img
            src={config.leftFlapOuterImage}
            alt='left-flap'
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 0,
            }}
          />
        )}
        {/* 信封右开口外侧图 */}
        {config.rightFlapOuterImage && (
          <img
            src={config.rightFlapOuterImage}
            alt='right-flap'
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 0,
            }}
          />
        )}

        {/* 信封印章 */}
        {config.envelopeSealImage && (
          <img
            src={config.envelopeSealImage}
            alt='envelope-seal'
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 1,
            }}
          />
        )}
      </div>
    </div>
  );
}
