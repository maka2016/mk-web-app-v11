import React, { useEffect, useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { useThemePackContext } from '../../DesignerToolForEditor/ThemePackManager/ThemeProvider';
import {
  createThemePackLayout,
  saveThemePack,
} from '../../DesignerToolForEditor/ThemePackManager/services';
import styled from '@emotion/styled';
import { CoverManager } from './CoverManager';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import ThemeManager2 from './ThemeManager2';
import { useGridContext } from '../../comp/provider';
import { getCopyRowCode } from '../../comp/provider/operator';
import toast from 'react-hot-toast';

const CreateThemePackLayoutRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  .settingItem {
    display: flex;
    flex-direction: column;
    gap: 6px;
    .label {
      font-family: PingFang SC;
      font-weight: 600;
      font-size: 14px;
      line-height: 22px;
      color: #000;
    }
  }
  .footer {
    position: sticky;
    background-color: #fff;
    bottom: 0;
    padding: 8px 16px 16px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    box-shadow: 0px 1px 0px 0px #eceef0 inset;
  }
`;

interface CreateThemePackLayoutProps {
  onSave: (res: any) => void;
  onClose: () => void;
}

interface Floor {
  id: number;
  name: string;
  documentId: string;
}

const CreateThemePackLayout = (props: CreateThemePackLayoutProps) => {
  const { onSave, onClose } = props;
  const { widgetState, editorSDK, editorCtx, cellsMap, rowsGroup } =
    useGridContext();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [floorId, setFloorId] = useState('');

  const { activeRowId } = widgetState || {};
  const { selectedMaterialChannel, selectedThemePack } = useThemePackContext();
  const rowIndex = cellsMap.findIndex(row => row.id === activeRowId);
  const currBlock = rowsGroup.find(block =>
    block.rowIds.includes(activeRowId || '')
  );

  if (rowIndex < 0) {
    return <div className='p-4'>请先选中一个模块</div>;
  }

  return (
    <CreateThemePackLayoutRoot>
      <div className='flex flex-col gap-6 p-4'>
        <div className='settingItem'>
          <div className='label'>名称</div>
          <Input
            variantSize='sm'
            value={name}
            onChange={e => {
              const value = e.target.value;
              setName(value);
            }}
          />
        </div>
        <div className='settingItem'>
          <div className='label'>分组</div>
          <Select
            value={floorId}
            onValueChange={value => {
              setFloorId(value);
              // if (!editMaterialItem) return;
              // const floor: any[] = floors.filter(item => item.documentId === value)
              // setEditMaterialItem({
              //   ...editMaterialItem,
              //   material_tags: floor
              // })
            }}
          >
            <SelectTrigger className='w-full h-8'>
              <SelectValue placeholder='选择分组' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {selectedMaterialChannel?.material_tags?.map(floorItem => (
                  <SelectItem
                    key={floorItem.documentId}
                    value={floorItem.documentId}
                  >
                    {floorItem.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className='settingItem'>
          <div className='label'>封面</div>
          <CoverManager
            coverUrl={coverUrl}
            blockId={currBlock?.groupId}
            setCoverUrl={nextUrl => {
              setCoverUrl(nextUrl);
            }}
            // rowId={activeRowId}
            editorCtx={editorCtx}
          />
        </div>
      </div>
      <div className='footer'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            onClose();
          }}
        >
          取消
        </Button>
        <Button
          size='sm'
          disabled={loading || !name || !floorId}
          onClick={async () => {
            setLoading(true);
            const themeDocumentId = selectedThemePack?.documentId;

            if (!themeDocumentId) {
              toast.error('请先选择一个主题包');
              return;
            }
            if (!editorSDK || !widgetState) return;
            const copyRowCode = getCopyRowCode({
              cellsMap,
              editorSDK,
              widgetState,
              rowsGroup,
            });
            console.log('copyRowCode', copyRowCode);
            if (!copyRowCode) {
              toast.error('请先选择一个元素');
              return;
            }

            if (typeof rowIndex === 'undefined') {
              console.log('没有选择的row');
              toast.error('请先选中一个模块');
              return;
            }
            const dom = document.querySelector('.Row.selected');
            if (!dom) {
              toast.error('请先选中一个模块');
              return;
            }

            const res = await createThemePackLayout({
              name,
              content: copyRowCode,
              author: selectedThemePack?.author || '',
              cover_url: coverUrl,
              theme_pack_v2: {
                connect: [themeDocumentId],
              },
              material_tags: {
                connect: [floorId],
              },
            });
            console.log('res', res);
            onSave(res);
            setLoading(false);
          }}
        >
          保存
        </Button>
      </div>
    </CreateThemePackLayoutRoot>
  );
};

export default CreateThemePackLayout;
