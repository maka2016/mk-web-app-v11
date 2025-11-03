import { LayerElemItem } from '@mk/works-store/types';
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { cdnApi } from '@mk/services';
import { Layers, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Button } from '@workspace/ui/components/button';
import { useGridContext } from '../../comp/provider';
import { BtnLite } from '../../shared/style-comps';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
`;

const FreeLayerContentRoot = styled.div`
  z-index: 1111;
  position: relative;
`;

const LayerListContainer = styled.div`
  max-height: 50vh;
  overflow-y: auto;
`;

const LayerItem = styled.div`
  height: 42px;
  overflow: hidden;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;

  &:hover {
    background-color: #f0f0f0;
  }

  .layer_cover {
    height: 100%;
    margin-right: 8px;
  }

  .layer_name {
    flex: 1;
    font-size: 14px;
  }

  .layer_type {
    font-size: 12px;
    color: #666;
  }

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
  }
`;

const LayerList = ({
  blockId,
  onClick,
}: {
  blockId: string;
  onClick: (id: string, rowId: string, cellId?: string) => void;
}) => {
  const { editorSDK, cellsMap, rowsGroup } = useGridContext();
  const absoluteLayers: {
    rowId: string;
    cellId?: string;
    layer: LayerElemItem;
  }[] = [];
  const currGroup = rowsGroup.find(group => group.rowIds.includes(blockId));
  const blockRows = cellsMap.filter(row => currGroup?.rowIds.includes(row.id));
  blockRows?.forEach(row => {
    row.childrenIds?.forEach(id => {
      const layer = editorSDK?.getLayer(id);
      if (layer?.attrs?.absoluteElem) {
        absoluteLayers.push({
          rowId: row.id,
          layer,
        });
      }
    });
    row?.cells.forEach(cell => {
      cell.childrenIds?.forEach(id => {
        const layer = editorSDK?.getLayer(id);
        if (layer?.attrs?.absoluteElem) {
          absoluteLayers.push({
            rowId: row.id,
            cellId: cell.id,
            layer,
          });
        }
      });
    });
  });
  if (absoluteLayers.length === 0) {
    return <div className='p-4 text-center text-gray-500'>无自由元素</div>;
  }
  return (
    <>
      {absoluteLayers.map(({ rowId, cellId, layer }) => {
        const isPic = /picture/.test(layer?.elementRef);
        const isText = /text/.test(layer?.elementRef);
        return (
          <LayerItem
            key={layer.elemId}
            data-layer-id={layer.elemId}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onClick(layer.elemId, rowId, cellId);
            }}
          >
            {layer?.attrs.ossPath && (
              <div className='layer_cover'>
                <img src={cdnApi(layer?.attrs.ossPath)} alt='' />
              </div>
            )}
            <div className='layer_name'>{layer?.attrs.text}</div>
            <div className='layer_type'>
              {isPic && '图片'}
              {isText && '文字'}
            </div>
          </LayerItem>
        );
      })}
    </>
  );
};

export default function FreeLayerContent({ blockId }: { blockId: string }) {
  const { editorSDK } = useGridContext();
  const [open, setOpen] = useState(false);

  return (
    <FreeLayerContentRoot>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <BtnLite2>
            <Layers size={20} />
          </BtnLite2>
        </PopoverTrigger>
        <PopoverContent
          className='w-80 p-0'
          align='end'
          side='bottom'
          sideOffset={0}
        >
          <div className='flex items-center justify-between p-2 border-b'>
            <div className='font-semibold text-sm'>图层管理</div>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>
          <LayerListContainer>
            <LayerList
              blockId={blockId}
              onClick={(id, rowId, cellId) => {
                editorSDK?.changeWidgetState({
                  activeRowId: rowId,
                  editingElemId: id,
                  activeCellId: cellId,
                });
                setOpen(false);
              }}
            />
          </LayerListContainer>
        </PopoverContent>
      </Popover>
    </FreeLayerContentRoot>
  );
}
