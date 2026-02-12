import { mergeDeep } from '@/utils';
import styled from '@emotion/styled';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';
import { BackgroundGroupType } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import SwitchLite from '../SwitchLite';
import AppearanceSettings from './AppearanceSettings';
import AutoLayoutSettings from './AutoLayoutSettings';
import BackgroundSetting from './BackgroundSetting';
import HistoryFeaturesGroup from './HistoryFeaturesGroup';
import PositionSettings from './PositionSettings';

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
  useTransform?: boolean;
  usePadding?: boolean;
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
  options?: { text: string; value: string }[];
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
          className='w-full h-6'
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

const GroupWrapper = ({
  children,
  title,
  icon,
  collapsible = false,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

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
    useAppearance = true,
    useFrontground = false,
    showAutoLayout = false,
    usePadding = true,
    useTransform = true,
    parentStyle,
    isAbsoluteElement = false,
    reverse = false,
    onChange,
  } = props;
  const worksStore = useWorksStore();
  const { widgetStateV2 } = worksStore;
  const { getActiveRow, setRowAttrsV2 } = worksStore.gridPropsOperator;
  const { editingElemId } = widgetStateV2;
  const activeRow = getActiveRow();
  const targetDOM = !editingElemId
    ? document.querySelector<HTMLElement>(
      `#designer_scroll_container #editor_row_${activeRow?.id}`
    )
    : document.querySelector<HTMLElement>(
      `#designer_scroll_container #elem_wrapper_${editingElemId}`
    );
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
              // useAlign={
              //   activeRowDepth && activeRowDepth?.length > 1 ? true : false
              // }
              usePadding={usePadding}
              style={itemStyle}
              showAutoLayout={showAutoLayout}
              isList={isList}
              onChange={_onChange}
            />
          </GroupWrapper>

          <Separator />

          {useTransform && (
            <>
              <GroupWrapper title='位置' collapsible={true}>
                <PositionSettings
                  useAlign={false}
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
        </>
      )}
      {useAppearance && (
        <>
          <GroupWrapper title='外观背景组' collapsible={true}>
            <BackgroundSetting
              useFrontground={useFrontground || false}
              targetDOM={targetDOM || undefined}
              onChange={value => {
                _onChange({
                  ...itemStyle,
                  ...value,
                });
              }}
              itemStyle={itemStyle as React.CSSProperties & { borderImage3?: Record<string, unknown> }}
            />
          </GroupWrapper>

          <Separator />
          <GroupWrapper title='网页样式' collapsible={true}>
            <AppearanceSettings
              style={itemStyle}
              onChange={_onChange}
            />
          </GroupWrapper>

          <Separator />
          <GroupWrapper
            title='历史功能'
            collapsible={true}
            defaultCollapsed={true}
          >
            <HistoryFeaturesGroup
              style={itemStyle}
              onChange={_onChange}
              targetDOM={targetDOM || undefined}
              lottieBgConfig={
                !editingElemId ? activeRow?.lottieBgConfig : undefined
              }
              lottieFgConfig={
                !editingElemId ? activeRow?.lottieFgConfig : undefined
              }
              onLottieBgChange={
                !editingElemId
                  ? lottieBgConfig => {
                    setRowAttrsV2({
                      lottieBgConfig,
                    });
                  }
                  : undefined
              }
              onLottieFgChange={
                !editingElemId
                  ? lottieFgConfig => {
                    setRowAttrsV2({
                      lottieFgConfig,
                    });
                  }
                  : undefined
              }
            />
          </GroupWrapper>
        </>
      )}
    </BlockStyleSettingContainer>
  );
}
