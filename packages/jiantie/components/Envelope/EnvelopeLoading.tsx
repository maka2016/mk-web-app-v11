/**
 * 服务端渲染的信封 Loading 组件
 * 显示信封的初始状态，客户端接管后播放动画
 */
import { EnvelopeConfig } from './types';

interface EnvelopeLoadingProps {
  config?: EnvelopeConfig;
}

export default function EnvelopeLoading({ config }: EnvelopeLoadingProps) {
  if (!config || !config.backgroundImage) {
    return null;
  }

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
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* 信封层 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90vw',
          maxWidth: '600px',
          aspectRatio: '3 / 2',
        }}
      >
        {/* 信封正面 */}
        {config.envelopeFrontImage && (
          <img
            src={config.envelopeFrontImage}
            alt='envelope-front'
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
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
            }}
          />
        )}
      </div>
    </div>
  );
}
