import { Label } from '@workspace/ui/components/label';
import { useGridContext } from '../../comp/provider';
import { Button } from '@workspace/ui/components/button';
import React, { useEffect, useState } from 'react';
import { getAllElementRef } from '../../comp/utils';
import { formEntityServiceApi, getPageId, getUid } from '@mk/services';
import { getAppId } from '@mk/services';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/alert';
import { CheckCircle2Icon } from 'lucide-react';
import { useWidgetsAttrs } from '../../comp/WidgetLoader';
import { IWorksData } from '@mk/works-store/types';

export default function WidgetManager({
  worksData,
  onSetting,
}: {
  worksData: IWorksData;
  onSetting: (elementRef: string) => void;
}) {
  const { editorSDK } = useGridContext();
  const { getWidgetList } = useWidgetsAttrs({ worksData });
  if (!worksData) {
    return null;
  }
  const allLayerMap = getAllElementRef(worksData);
  const getLayerByElementRef = (elementRef: string) => {
    const layer = allLayerMap[elementRef]?.[0];
    return layer;
  };

  return (
    <>
      <div className='p-4 space-y-2'>
        <div>
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>使用说明</AlertTitle>
            <AlertDescription>
              <p>2个关键状态：</p>
              <p>
                1.
                组件是否添加，已添加的组件用户编辑器会出现对应的设置按钮，移除后用户将不可设置，可以通过「用户编辑器」功能检查是否正确添加。
              </p>
              <p>2. 组件是否开启，作品/模版默认开启该功能。</p>
            </AlertDescription>
          </Alert>
        </div>
        {getWidgetList().map(item => {
          const layerId = getLayerByElementRef(item.elementRef);
          const layer = editorSDK?.getLayer(layerId);
          const hasLayer = !!layer;
          const isShow = layer?.attrs.show;
          return (
            <div className='flex items-center space-x-2' key={item.elementRef}>
              <Label htmlFor={item.elementRef}>
                {item.name}[{isShow ? '开启中' : '隐藏中'}]
              </Label>
              {!hasLayer && (
                <Button
                  variant='outline'
                  size='xs'
                  onClick={() => {
                    item.onAdd();
                  }}
                >
                  添加组件
                </Button>
              )}
              {hasLayer && (
                <>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={() => {
                      onSetting(item.elementRef);
                    }}
                  >
                    设置
                  </Button>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={() => {
                      if (isShow) {
                        item.onDisable();
                      } else {
                        item.onAdd();
                      }
                    }}
                  >
                    {!isShow ? '隐藏' : '开启'}
                  </Button>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={() => {
                      item.onRemove();
                    }}
                  >
                    移除
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
