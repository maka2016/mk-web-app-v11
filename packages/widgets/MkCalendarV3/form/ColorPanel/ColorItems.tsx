import styled from '@emotion/styled';
import React from 'react';
import { ColorItemProps, ColorItemsProps } from './types';
import { normalizeColorValue } from './utils';

const ColorItemStyled = styled.div`
  background: #fff;
  border-radius: 2px;
  width: 18px;
  height: 18px;
  border: 1px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  aspect-ratio: 1/1;

  &.selected {
    transform: scale(1.1);
    z-index: 2;
    box-shadow: 0 0 0 2px #187cea;
  }

  .color_val {
    border-radius: 2px;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
`;

export const ColorItem: React.FC<ColorItemProps> = ({
  color,
  onClick,
  isActive,
}) => {
  // 验证颜色对象
  if (!color) {
    console.warn('Invalid color object:', color);
    return null;
  }

  // 标准化颜色值
  const normalizedValue = normalizeColorValue(color);

  // 处理点击事件
  const handleClick = () => {
    try {
      onClick?.(color);
    } catch (error) {
      console.error('Error handling color click:', error);
    }
  };

  return (
    <ColorItemStyled
      className={isActive ? 'selected' : ''}
      onClick={handleClick}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div
        className='color_val'
        style={{
          background: normalizedValue,
          // 如果是渐变，使用background-image
          ...(normalizedValue?.includes('gradient') && {
            backgroundImage: normalizedValue,
            background: 'transparent',
          }),
        }}
      />
    </ColorItemStyled>
  );
};

export const ColorItems: React.FC<ColorItemsProps> = ({
  colorList,
  selectedColor,
  onClick,
}) => {
  // 验证输入参数
  if (!Array.isArray(colorList)) {
    console.warn('colorList must be an array:', colorList);
    return null;
  }

  if (!onClick || typeof onClick !== 'function') {
    console.warn('onClick must be a function');
    return null;
  }

  return (
    <div className='flex items-center gap-2'>
      {colorList.map((color, index) => {
        // 更精确的激活状态判断
        const isActive = selectedColor === color;

        return (
          <ColorItem
            key={color}
            color={color}
            isActive={!!isActive}
            onClick={onClick}
          />
        );
      })}
    </div>
  );
};
