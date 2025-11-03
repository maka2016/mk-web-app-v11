import styled from '@emotion/styled';
import React from 'react';
import { ColorItemProps, ColorItemsProps } from './types';
import { normalizeColorValue } from './utils';

const ColorItemStyled = styled.div`
  background: #fff;
  border-radius: 2px;
  min-width: 20px;
  min-height: 20px;
  border: 1px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  aspect-ratio: 1/1;
  position: relative;
  /* transition:
    transform 0.2s ease,
    box-shadow 0.2s ease; */

  /* &:hover {
    transform: scale(1.1);
    z-index: 1;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
  } */

  &.selected {
    transform: scale(1.1);
    z-index: 2;
    box-shadow: 0 0 0 2px #187cea;
  }

  .color_val {
    border-radius: inherit;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
`;

export const ColorItem: React.FC<ColorItemProps> = ({
  color,
  isActive,
  onClick,
  itemStyle,
}) => {
  // 验证颜色对象
  if (!color || !color.value) {
    console.warn('Invalid color object:', color);
    return null;
  }

  // 标准化颜色值
  const normalizedValue = normalizeColorValue(color.value);

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
      title={color.name || normalizedValue}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={itemStyle}
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
  itemStyle,
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

  // 过滤无效的颜色对象
  const validColors = colorList.filter(color => {
    if (!color || !color.value) {
      console.warn('Invalid color in list:', color);
      return false;
    }
    return true;
  });

  if (validColors.length === 0) {
    return null;
  }

  return (
    <>
      {validColors.map((color, index) => {
        // 更精确的激活状态判断
        const isActive =
          selectedColor &&
          color.colorRefId &&
          color.colorRefId === selectedColor.colorRefId;

        return (
          <ColorItem
            key={`${color.colorRefId || color.value}-${index}`}
            color={color}
            isActive={!!isActive}
            onClick={onClick}
            itemStyle={itemStyle}
          />
        );
      })}
    </>
  );
};
