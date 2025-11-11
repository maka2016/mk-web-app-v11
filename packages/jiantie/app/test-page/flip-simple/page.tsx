'use client';

import styled from '@emotion/styled';
import { motion } from 'motion/react';
import { useState } from 'react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  gap: 40px;
  padding: 20px;
`;

const FlipCard = styled.div`
  width: 400px;
  height: 300px;
  perspective: 1000px;
`;

const FlipInner = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: center;
  transform-style: preserve-3d;
`;

const FlipSide = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  &.front {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  &.back {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    transform: rotateY(-180deg);
  }
`;

const Button = styled.button`
  padding: 16px 32px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const InfoBox = styled.div`
  background: rgba(255, 255, 255, 0.2);
  padding: 20px;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  max-width: 600px;
  text-align: center;
`;

export default function SimpleFlipTest() {
  const [rotateY, setRotateY] = useState(0);
  const [useStyle, setUseStyle] = useState(true);

  return (
    <Container>
      <h1 style={{ color: 'white', fontSize: '36px', margin: 0 }}>
        3D 翻转调试 - Motion 组件测试
      </h1>

      <InfoBox>
        <div>当前旋转角度: {rotateY}°</div>
        <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.9 }}>
          正面应该在 0° 显示，背面应该在 -180° 显示
        </div>
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type='checkbox'
              checked={useStyle}
              onChange={e => setUseStyle(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span>
              使用 style 显式设置 transformStyle (
              {useStyle ? '✅ 开启' : '❌ 关闭'})
            </span>
          </label>
        </div>
      </InfoBox>

      <FlipCard>
        <FlipInner
          animate={{ rotateY }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          style={
            useStyle
              ? {
                  transformStyle: 'preserve-3d',
                }
              : undefined
          }
        >
          <FlipSide className='front'>正面 (0°)</FlipSide>
          <FlipSide className='back'>背面 (-180°)</FlipSide>
        </FlipInner>
      </FlipCard>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <Button onClick={() => setRotateY(0)}>0°</Button>
        <Button onClick={() => setRotateY(-45)}>-45°</Button>
        <Button onClick={() => setRotateY(-90)}>-90°</Button>
        <Button onClick={() => setRotateY(-135)}>-135°</Button>
        <Button onClick={() => setRotateY(-180)}>-180°</Button>
        <Button onClick={() => setRotateY(-225)}>-225°</Button>
        <Button onClick={() => setRotateY(-270)}>-270°</Button>
        <Button onClick={() => setRotateY(-315)}>-315°</Button>
        <Button onClick={() => setRotateY(-360)}>-360° (0°)</Button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <Button onClick={() => setRotateY(prev => prev - 10)}>← -10°</Button>
        <Button onClick={() => setRotateY(prev => prev + 10)}>+10° →</Button>
      </div>
    </Container>
  );
}
