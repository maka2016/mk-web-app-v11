import { mergeDeep } from '@mk/utils';
import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { BackgroundGroupType } from '../../shared';
import BackgroundSetting from './BackgroundSetting';
import { Label } from '@workspace/ui/components/label';
import { IconInput } from '@workspace/ui/components/icon-input';
import AutoLayoutSettings from './AutoLayoutSettings';
import PositionSettings from './PositionSettings';
import AppearanceSettings from './AppearanceSettings';
import { ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { Icon } from '@workspace/ui/components/Icon';
import { Separator } from '@workspace/ui/components/separator';
import { Input } from '@workspace/ui/components/input';
import { useGridContext } from '../../comp/provider';
import { numberChunkValueToString, stringValueTo4Chunk } from './utils';
import SwitchLite from '../SwitchLite';
import { cn } from '@workspace/ui/lib/utils';

const BlockStyleSettingContainer = styled.div`
  display: flex;
  flex-direction: column;

  .grid_container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }
`;

interface BlockStyleSettingProps {
  style: any;
  /**
   * 是否列表
   * - 是：使用Grid布局
   * - 否：使用Flex布局
   */
  isList?: boolean;
  useLayoutGroup?: boolean;
  useAppearance?: boolean;
  useFrontground?: boolean;
  showAutoLayout?: boolean;
  showPositioning?: boolean;
  parentStyle?: any;
  isAbsoluteElement?: boolean;
  reverse?: boolean;
  onChange: (value: React.CSSProperties) => void;
}

export const SingleValueStyleSettingItem = ({
  title,
  value,
  options,
  onAddByDefault,
  onRemove,
  onChange,
}: {
  title: string;
  value: any;
  options: { text: string; value: string }[];
  onAddByDefault: () => void;
  onRemove: () => void;
  onChange: (value: any) => void;
}) => {
  return (
    <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
      <div className='px-2 flex items-center justify-between'>
        <Label className='text-xs'>{title}</Label>
        <SwitchLite
          active={typeof value !== 'undefined'}
          onChange={active => {
            if (active) {
              onAddByDefault();
            } else {
              onRemove();
            }
          }}
        />
      </div>
      {typeof value !== 'undefined' && (
        <div className='px-2'>
          <TooltipSelector
            className='w-full'
            title={''}
            value={value}
            options={options}
            placeholder=''
            onChange={nextValue => {
              onChange(nextValue);
            }}
          />
        </div>
      )}
    </div>
  );
};

const TooltipSelector = ({
  value,
  title,
  placeholder,
  options = [],
  tipAction,
  onChange,
  className,
}: {
  value: string;
  title: string;
  placeholder: string;
  tipAction?: () => void;
  options?:
    | { text: string; value: string }[]
    | ((value: string) => { text: string; value: string }[]);
  onChange: (value: string) => void;
  className?: string;
}) => {
  const optionsValue = typeof options === 'function' ? options(value) : options;
  return (
    <div style={{ position: 'relative' }} className={className}>
      <div>
        <Input
          className='w-full'
          type='text'
          title={title}
          value={value}
          placeholder={placeholder}
          onChange={e => {
            onChange(e.target.value);
          }}
        />
      </div>

      <div className='flex flex-wrap mt-1 gap-2'>
        {optionsValue.map(item => {
          return (
            <div
              data-key={item.value}
              className='text-xs rounded-sm cursor-pointer text-gray-500 hover:bg-gray-200'
              key={item.value}
              onClick={() => {
                onChange(item.value);
              }}
            >
              {item.text || item.value}
            </div>
          );
        })}
      </div>
      {tipAction && (
        <div
          className='text-xs text-gray-500'
          style={{
            cursor: 'pointer',
            zIndex: 1000,
            fontSize: 12,
            color: '#000',
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={tipAction}
        >
          <span>说明？</span>
        </div>
      )}
    </div>
  );
};

export const SettingItemFor4Value = ({
  value,
  label,
  shortcutData,
  inputOnly = false,
  onChange,
}: {
  value: string;
  label: string;
  inputOnly?: boolean;
  shortcutData?: { text: string; value: any }[];
  onChange: (nextVal?: string) => void;
}) => {
  const [valueChunk, setValueChunk] = React.useState(
    stringValueTo4Chunk(value)
  );

  const hasValue = !!valueChunk;

  const handleSideChangePadding = (value: number, index: number) => {
    const newValues: [number, number, number, number] = [
      ...(valueChunk || [0, 0, 0, 0]),
    ];
    newValues[index] = value;

    setValueChunk(newValues);
  };

  const handleChange = (value: string) => {
    const values = stringValueTo4Chunk(value);
    console.log('values', values);
    setValueChunk(values);
  };

  useEffect(() => {
    const commitData = numberChunkValueToString(valueChunk);
    if (commitData === value) {
      return;
    }
    onChange(commitData);
  }, [valueChunk]);

  useEffect(() => {
    const nextChunk = stringValueTo4Chunk(value);
    if (nextChunk && JSON.stringify(nextChunk) !== JSON.stringify(valueChunk)) {
      setValueChunk(nextChunk);
    }
  }, [value]);

  const renderInput = () => {
    return (
      <div className='grid grid-cols-1 gap-1'>
        <div className='grid grid-cols-2 gap-1'>
          <IconInput
            icon2={<Icon name='dingjianju' size={12} />}
            type='number'
            value={valueChunk?.[0]}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 0);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          <IconInput
            icon2={<Icon name='youjianju' size={12} />}
            type='number'
            value={valueChunk?.[1]}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 1);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          <IconInput
            icon2={<Icon name='dijianju' size={12} />}
            type='number'
            value={valueChunk?.[2]}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 2);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          <IconInput
            icon2={<Icon name='zuojianju' size={12} />}
            type='number'
            value={valueChunk?.[3]}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 3);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
        </div>
        <div className='flex items-center gap-1'>
          <IconInput
            icon2={<Icon name='xiantiaocuxi' size={12} />}
            type='number'
            value={valueChunk?.[0]}
            className='flex-1'
            onChange={e => {
              const value = e.target.value;
              handleChange(value);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          {shortcutData?.map((item, index) => (
            <div
              key={index}
              className='px-2 text-gray-500 h-6 flex justify-center items-center rounded-sm bg-white text-xs cursor-pointer'
              onClick={() => {
                const values = stringValueTo4Chunk(item.value);
                setValueChunk(values);
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (inputOnly) {
    return renderInput();
  }

  return (
    <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
      <div className='px-2 flex items-center justify-between'>
        <Label className='text-xs'>{label}</Label>
        {hasValue ? (
          <Minus
            className='cursor-pointer'
            size={14}
            onClick={() => {
              onChange(undefined);
              setValueChunk(undefined);
            }}
          />
        ) : (
          <Plus
            size={14}
            className='cursor-pointer'
            onClick={() => {
              setValueChunk([0, 0, 0, 0]);
            }}
          />
        )}
      </div>
      {hasValue ? <div className='px-2'>{renderInput()}</div> : null}
    </div>
  );
};

const GroupWrapper = ({
  children,
  title,
  icon,
  collapsible = false,
}: {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className='flex flex-col'>
      <div
        className={cn(
          'p-2 flex items-center justify-between',
          collapsible ? 'cursor-pointer hover:bg-gray-50' : '',
          !collapsed && 'mb-2'
        )}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
      >
        <div className='flex items-center gap-2'>
          {icon}
          <div className='title text-xs font-medium text-gray-800'>{title}</div>
        </div>
        {collapsible &&
          (collapsed ? (
            <ChevronDown size={12} className='text-gray-500' />
          ) : (
            <ChevronUp size={12} className='text-gray-500' />
          ))}
      </div>
      {(!collapsible || !collapsed) && (
        <div className='px-2 pb-2 flex flex-col gap-2'>{children}</div>
      )}
    </div>
  );
};

export default function StyleCustomSetting(props: BlockStyleSettingProps) {
  const {
    style,
    isList = false,
    useLayoutGroup = true,
    useFrontground = false,
    showAutoLayout = false,
    useAppearance = true,
    parentStyle,
    isAbsoluteElement = false,
    reverse = false,
    onChange,
  } = props;
  const { editorCtx, useGridV2, getActiveRow } = useGridContext();
  const activeRow = getActiveRow();
  const itemStyle = style || {};
  const _onChange = (
    value: React.CSSProperties & {
      backgroundGroup?: BackgroundGroupType;
    }
  ) => {
    onChange(mergeDeep(itemStyle, value));
  };

  return (
    <BlockStyleSettingContainer>
      {useLayoutGroup && (
        <>
          <GroupWrapper title='布局' collapsible={true}>
            <AutoLayoutSettings
              style={itemStyle}
              showAutoLayout={showAutoLayout}
              isList={isList}
              onChange={_onChange}
            />
          </GroupWrapper>

          <Separator />

          {/* 位置分组 - 仿照 Figma Position & Size */}
          <GroupWrapper title='位置' collapsible={true}>
            <PositionSettings
              useAlign={!useGridV2}
              style={itemStyle}
              parentStyle={parentStyle}
              isAbsoluteElement={isAbsoluteElement}
              reverse={reverse}
              onChange={_onChange}
            />
          </GroupWrapper>

          <Separator />
        </>
      )}

      {useAppearance && (
        <GroupWrapper title='外观' collapsible={true}>
          <AppearanceSettings
            style={itemStyle}
            onChange={_onChange}
            targetDOM={
              (document.querySelector(
                '[data-actived="true"]'
              ) as HTMLElement) ||
              (document.querySelector(
                `#editor_row_${activeRow?.id}`
              ) as HTMLElement) ||
              undefined
            }
          />

          <BackgroundSetting
            useFrontground={useFrontground || false}
            onChange={value => {
              _onChange({
                ...itemStyle,
                ...value,
              });
            }}
            itemStyle={itemStyle as any}
            editorCtx={editorCtx}
          />
        </GroupWrapper>
      )}
    </BlockStyleSettingContainer>
  );
}
