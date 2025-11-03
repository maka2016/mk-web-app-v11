import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { BtnLite as BtnLiteBase } from '../../shared/style-comps';
import { getPermissionData } from '@mk/services';
import styled from '@emotion/styled';
import { useGridContext } from '../../comp/provider';

const Container = styled.div`
  height: 36px;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  /* gap: 4px; */
  justify-content: center;
  .split {
    background-color: #0000000f;
    height: 16px;
    width: 1px;
  }
`;

const BtnLite = styled(BtnLiteBase)`
  gap: 4px;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    background-color: #f5f5f5;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export interface MoreOptionsProps {
  toEditRowDepth: number[];
}

export const SettingCellForGroupV2 = (props: MoreOptionsProps) => {
  const { widgetState, editorSDK } = useGridContext();
  const { activeRowDepth } = widgetState;

  if (!activeRowDepth) return <div data-tip='none-operator'></div>;
  const fullStack = getPermissionData().materialProduct;

  // 没选中元素 & 选中格子
  return (
    <>
      <Container title={fullStack ? '单元格' : ''}>
        <BtnLite
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            editorSDK?.changeWidgetState({
              activeRowDepth: props.toEditRowDepth,
              showRepeatListEditor: true,
              editingElemId: undefined,
            });
          }}
        >
          <span>编辑列表</span>
        </BtnLite>
        <BtnLite
          style={{
            borderLeft: '1px solid #0000000f',
            marginLeft: 8,
          }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            editorSDK?.changeWidgetState({
              activeRowDepth: activeRowDepth,
            });
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
        >
          <Check size={20} />
        </BtnLite>
      </Container>
    </>
  );
};
