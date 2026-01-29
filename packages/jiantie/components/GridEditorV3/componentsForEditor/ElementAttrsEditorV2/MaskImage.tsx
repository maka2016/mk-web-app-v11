import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import React, { useState } from 'react';
import { showSelector } from '../../../showSelector';

const PaibanRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  .paiban_group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .title {
      font-size: 12px;
      color: #999;
    }
  }

  .paiban_items {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .paiban_item {
    display: flex;
    flex-direction: column;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
    background-color: #fff;
    &:hover {
      border-color: #ccc;
    }
    &.active {
      border-color: var(--theme-color);
      color: var(--theme-color);
    }
  }
`;

export const getMaskImagePreset = () => {
  return [
    {
      label: '无',
      value: { maskImage: 'none' },
    },
    {
      label: '底不透明30%',
      value: { maskImage: 'linear-gradient(black 70%, transparent 100%)' },
    },
    {
      label: '顶不透明30%',
      value: {
        maskImage: 'linear-gradient(to top, black 70%, transparent 100%)',
      },
    },
    {
      label: '左不透明30%',
      value: {
        maskImage: 'linear-gradient(to left, black 70%, transparent 100%)',
      },
    },
    {
      label: '右不透明30%',
      value: {
        maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
      },
    },
    {
      label: '圆形中心镂空',
      value: { maskImage: 'radial-gradient(transparent 40%, black 60%)' },
    },
    {
      label: '圆形边缘模糊40%',
      value: { maskImage: 'radial-gradient(black 60%, transparent 100%)' },
    },
    {
      label: '自定义',
      action: () => {
        return new Promise((resolve, reject) => {
          showSelector({
            onSelected: (params: any) => {
              console.log('params', params);
              const { url, type, ossPath } = params;
              resolve({
                maskImage: `url(${cdnApi(ossPath)})`,
                maskSize: 'cover',
                maskRepeat: 'no-repeat',
                maskPosition: 'top center',
              });
            },
            type: 'picture',
          });
        });
      },
    },
  ].map((item, idx) => {
    return {
      id: `mask${idx}`,
      ...item,
    };
  });
};

const getLayoutConfig = (styleVal: React.CSSProperties) => [
  { label: '渐变蒙版', datas: getMaskImagePreset() },
];

export default function MaskImageConfig({
  value,
  onChange,
}: {
  value: React.CSSProperties;
  onChange: (value: React.CSSProperties) => void;
}) {
  const [_value, setValue] = useState(value || {});
  const _onChange = (nextValue: any) => {
    setValue({
      ..._value,
      ...nextValue,
    });
    onChange({
      ..._value,
      ...nextValue,
    });
  };
  return (
    <PaibanRoot>
      {getLayoutConfig(_value).map(groupItem => (
        <div className='paiban_group' key={groupItem.label}>
          <div className='title'>{groupItem.label}</div>
          <div className='paiban_items' key={groupItem.label}>
            {groupItem.datas.map((data: any) => {
              // const isActive = false
              const isActive =
                data.value &&
                Object.keys(data.value).some(key => {
                  return (
                    value?.[key as keyof React.CSSProperties] ===
                    data.value[key]
                  );
                });
              // console.log("isActive", isActive)
              return (
                <div
                  className={`paiban_item ${isActive ? 'active' : ''}`}
                  key={data.label}
                  onClick={() => {
                    if (data.action) {
                      data.action().then((nextValue: any) => {
                        _onChange(nextValue);
                      });
                    } else {
                      _onChange(data.value);
                    }
                  }}
                >
                  {data.label}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </PaibanRoot>
  );
}
