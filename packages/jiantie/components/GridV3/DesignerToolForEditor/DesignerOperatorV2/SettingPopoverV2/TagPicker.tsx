import React, { useEffect, useState } from 'react';
import cls from 'classnames';
import { useGridContext } from '../../../comp/provider';
import {
  getContainerTags,
  getElementDisplayName,
  getElementTags,
  getPictureElementTags,
  getTextElementTags,
} from '../../AddCompHelper/const';
import { SelectableElement } from '../../StylingManager/types';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { BtnLite } from '../../../shared/style-comps';
import { ChevronDown } from 'lucide-react';
import { cdnApi } from '@mk/services';
import Image from 'next/image';
import ContainerWithBgV2 from '../../../comp/ContainerWithBgV2';

export const TagPicker = ({
  replaceMode = false,
  noTitle = false,
  onClose,
}: {
  replaceMode?: boolean;
  noTitle?: boolean;
  onClose: () => void;
}) => {
  const {
    setRowAttrsV2,
    widgetStateV2,
    getActiveRow,
    editorSDK,
    getStyleByTag2,
  } = useGridContext();
  const { activeRowDepth, editingElemId } = widgetStateV2;
  const currTag = editingElemId
    ? editorSDK?.getLink(editingElemId)?.tag
    : getActiveRow()?.tag;
  const getTags = () => {
    if (editingElemId) {
      const layer = editorSDK?.getLayer(editingElemId);
      if (layer?.elementRef === 'Text') {
        return getTextElementTags();
      }
      if (layer?.elementRef === 'Picture') {
        return getPictureElementTags();
      }
      return getElementTags();
    }
    return getContainerTags();
  };
  const tagableElem = getTags() as any;

  const layer = editingElemId ? editorSDK?.getLayer(editingElemId) : null;
  const isPicture = layer?.elementRef === 'Picture';
  const isText = layer?.elementRef === 'Text';
  const isRow = !editingElemId;

  const renderChildren = (tag: string, tagName: string) => {
    if (isPicture) {
      return (
        <ContainerWithBgV2
          style={{
            ...getStyleByTag2(tag as SelectableElement),
          }}
        >
          {tagName}
          <Image
            width={100}
            height={100}
            src={cdnApi(layer.attrs.ossPath, {
              resizeWidth: 200,
            })}
            alt=''
          />
        </ContainerWithBgV2>
      );
    }
    if (isText) {
      return (
        <div
          style={{
            ...getStyleByTag2(tag as SelectableElement),
            fontSize: 16,
            margin: 0,
          }}
        >
          {tagName}
        </div>
      );
    }
    return (
      <div className='flex flex-col items-center justify-center w-full'>
        <div className='text-xs text-gray-500'>{tagName}</div>
        <ContainerWithBgV2
          clipBgScale={0.3}
          style={{
            ...getStyleByTag2(tag as SelectableElement),
            width: '100%',
            aspectRatio: '4/3',
            height: 'auto',
          }}
        ></ContainerWithBgV2>
      </div>
    );
  };

  return (
    <div
      className={cls(
        'p-4 grid grid-cols-2 gap-2 max-h-[75vh] overflow-y-auto'
        // isRow && "grid-cols-1"
        // isPicture ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"
      )}
    >
      {!noTitle && (
        <>当前标签：{getElementDisplayName(currTag as SelectableElement)}</>
      )}
      {Object.keys(tagableElem)
        .filter(
          tag =>
            !tagableElem[tag].includes('-d') && !['page', 'block'].includes(tag)
        )
        .map(tag => {
          const tagName = tagableElem[tag];
          const isActive = currTag === tag;
          return (
            <div
              key={tag}
              className={cls(
                'flex items-center gap-2 cursor-pointer py-2 px-1 rounded-md text-sm justify-center ring-1 ring-gray-100',
                {
                  'bg-gray-200 ring-1 ring-blue-500': isActive,
                }
              )}
              onClick={() => {
                if (editingElemId) {
                  const currTheme = getStyleByTag2(tag as SelectableElement);
                  editorSDK?.setLinkBatch([
                    {
                      elemId: editingElemId,
                      nextContainerInfo: {
                        tag: tag as any,
                      },
                    },
                  ]);
                  editorSDK?.changeCompAttr(editingElemId, {
                    version: (layer?.attrs.version || 0) + 1,
                    ...(replaceMode
                      ? {
                          ...layer?.attrs,
                          // 图片的都设置在layoutStyle中
                          ...(isPicture
                            ? {
                                layoutStyle: {
                                  ...layer?.attrs?.layoutStyle,
                                  ...currTheme,
                                },
                              }
                            : currTheme),
                        }
                      : {}),
                  });
                } else {
                  setRowAttrsV2({
                    tag: tag as any,
                  });
                }
                onClose();
              }}
            >
              {renderChildren(tag, tagName)}
            </div>
          );
        })}
    </div>
  );
};

export const TagPickerWrapper = () => {
  const { widgetStateV2, setWidgetStateV2 } = useGridContext();
  const { isTagPickerOpen } = widgetStateV2;
  return (
    <ResponsiveDialog
      isOpen={isTagPickerOpen}
      onOpenChange={nextVal => {
        setWidgetStateV2({
          isTagPickerOpen: nextVal,
        });
      }}
      contentProps={{
        className: 'w-[400px]',
      }}
    >
      <TagPicker
        onClose={() => {
          setWidgetStateV2({
            isTagPickerOpen: false,
          });
        }}
      />
    </ResponsiveDialog>
  );
};

export const TagPickerPopover = () => {
  const { widgetStateV2, getActiveRow, editorSDK } = useGridContext();
  const [open, setOpen] = useState(false);
  const { activeRowDepth, editingElemId } = widgetStateV2;
  const currTag = editingElemId
    ? editorSDK?.getLink(editingElemId)?.tag
    : getActiveRow()?.tag;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <BtnLite onClick={e => {}}>
          {getElementDisplayName(currTag as SelectableElement)}
          <ChevronDown size={14} />
        </BtnLite>
      </PopoverTrigger>
      <PopoverContent className='p-0'>
        <TagPicker
          replaceMode={true}
          onClose={() => {
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
