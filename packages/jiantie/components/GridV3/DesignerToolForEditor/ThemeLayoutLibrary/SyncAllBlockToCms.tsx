import styled from '@emotion/styled';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import { IconInput } from '@workspace/ui/components/icon-input';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useState } from 'react';
import toast from 'react-hot-toast';
import RowRendererV2 from '../../comp/components/RowRendererV2';
import { useGridContext } from '../../comp/provider';
import UpdateMaterialItemForm from '../MaterialResourceManager/UpdateMaterialItemForm';
import { getBlockCover, MaterialFloor } from '../ThemePackManager/services';
import { themePackV2CateId, themePackV2Manager } from './services';

const RowRoot = styled.div`
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 8px;
  .row_container {
    max-height: 100%;
    flex: 1;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 8px;
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .row_wrapper {
    position: relative;
    outline: 1px solid #eee;
    border-radius: 4px;
    padding: 4px;
    .row_content {
      * {
        pointer-events: none !important;
      }
    }
  }
  .action_area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.3);
  }
  .footer_action {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: 12px;
    background-color: #fff;
    border-top: 1px solid #e5e5e5;
    z-index: 10;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
  }
  .loading_container {
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-weight: bold;
  }
`;

interface Props {
  /** 主题包documentId */
  selectedCategory: string;
  categories: MaterialFloor[];
  onChange?: () => void;
}

export default function SyncAllBlockToCms({
  selectedCategory,
  categories,
  onChange,
}: Props) {
  const {
    gridsData,
    setRowAttrsV2,
    getCopyRowCodeV2,
    getStyleByTag2,
    gridStyle,
    designerInfo,
  } = useGridContext();
  const [editingLayout, setEditingLayout] = useState<any>(null);
  /** 统一设置作者 */
  const [author, setAuthor] = useState(
    gridsData[0]?.cmsSettingForThemePack2?.author || designerInfo.fullName || ''
  );
  const [blockSaveStatus, setBlockSaveStatus] = useState<
    Record<
      string,
      {
        isSaving: boolean;
        error: string;
      }
    >
  >({});
  const containerWidth = 800;
  const blockWidth = containerWidth / 4 + 24 + 8 * 5;
  const zoom = blockWidth / 375;

  const handleSave = async (saveItem: {
    blockIdx: number;
    blockId: string;
    cmsData: {
      content: string;
      name: string;
      documentId?: string;
      author: string;
      cover_url?: string;
      material_tags_documentId?: string;
    };
  }) => {
    const { blockIdx, cmsData, blockId } = saveItem;

    const { cover_url } = cmsData;
    if (!cover_url) {
      if (!blockId) {
        toast.error('请先选中一个blockId');
        return;
      }
      const tempUrl = await getBlockCover(blockId);
      if (!tempUrl) {
        toast.error('生成封面失败，请重试');
        return;
      }
      cmsData.cover_url = tempUrl;
    }
    if (cmsData.documentId) {
      await themePackV2Manager.updateItem(cmsData.documentId, {
        name: cmsData.name,
        author: cmsData.author,
        cover_url: cmsData.cover_url || '',
        content: cmsData.content as any,
        material_tags: {
          set: [selectedCategory],
        },
      });
      setRowAttrsV2(
        {
          cmsSettingForThemePack2: {
            documentId: cmsData.documentId,
            author: cmsData.author,
            name: cmsData.name,
            cover_url: cmsData.cover_url || '',
            material_tags_documentId: selectedCategory || '',
          },
        },
        {
          activeRowDepth: [blockIdx],
        }
      );
    } else {
      const res = await themePackV2Manager.createItem({
        name: cmsData.name,
        author: cmsData.author,
        content: cmsData.content as any,
        cover_url: cmsData.cover_url || '',
        material_class: {
          set: [themePackV2CateId],
        },
        material_tags: {
          set: [selectedCategory],
        },
      });
      setRowAttrsV2(
        {
          cmsSettingForThemePack2: {
            documentId: res.data.documentId,
            author: cmsData.author,
            name: cmsData.name,
            cover_url: cmsData.cover_url || '',
            material_tags_documentId: selectedCategory || '',
          },
        },
        {
          activeRowDepth: [blockIdx],
        }
      );
    }
  };

  const isSaving = Object.values(blockSaveStatus).some(
    status => status.isSaving
  );

  const resetBlock = async (
    cmsSetting: any,
    currBlock: any,
    blockIdx: number
  ) => {
    try {
      await themePackV2Manager.removeItem(cmsSetting.documentId);
    } catch (err) {
      toast.error('看起来已经删除过了，跳过删除，继续重置');
    }
    const resetSetting = {
      ...(currBlock.cmsSettingForThemePack2 || {}),
      documentId: '',
    } as any;
    setRowAttrsV2(
      {
        cmsSettingForThemePack2: resetSetting,
      },
      {
        activeRowDepth: [blockIdx],
      }
    );
    return resetSetting;
  };

  return (
    <>
      <RowRoot>
        <div className='m-2 text-xs'>
          <Alert className='p-2'>
            <AlertDescription className='text-xs'>
              <p>1. 分类规则：分类-名称 比如：封面-竖版</p>
              <p>
                2.
                第一次保存未保存版式会自动生成截图，时间需要比较长，请耐心等待
              </p>
              <p>3. 点击更新可以修改已保存的版式</p>
            </AlertDescription>
          </Alert>
        </div>
        <div className='row_container'>
          <RowRendererV2
            didLoaded={() => {}}
            readonly={true}
            isPlayFlipPage={false}
            isFlipPage={false}
            blockStyle={{
              width: blockWidth,
              zoom,
              boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
              aspectRatio: '1/1',
              overflow: 'hidden',
            }}
            blockWrapper={(rowDOM, blockIdx) => {
              const currBlock = gridsData[blockIdx];
              const isCurrSaving = blockSaveStatus[blockIdx]?.isSaving;
              const hasError = blockSaveStatus[blockIdx]?.error;
              const cmsSetting = currBlock.cmsSettingForThemePack2;
              return (
                <div
                  key={`row_${blockIdx}`}
                  className='row_wrapper relative'
                  style={{
                    ...getStyleByTag2('page', gridStyle),
                  }}
                >
                  <div className='p-2 action_area gap-1 flex flex-col'>
                    <IconInput
                      defaultValue={currBlock.name}
                      placeholder='请输入块名称'
                      onBlur={e => {
                        const newName = e.target.value;
                        if (newName && newName !== currBlock.name) {
                          setRowAttrsV2(
                            {
                              name: newName,
                            },
                            {
                              activeRowDepth: [blockIdx],
                            }
                          );
                        }
                      }}
                    />
                    {isCurrSaving && (
                      <div className='flex items-center gap-2 text-xs absolute bottom-0 left-0 right-0 top-0 justify-center loading_container'>
                        <Loading />
                        保存中...
                      </div>
                    )}
                    {hasError && (
                      <div className='flex items-center gap-2 text-xs justify-center loading_container'>
                        <Alert className='p-2'>
                          <AlertDescription className='text-xs'>
                            {hasError}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    {cmsSetting?.documentId ? (
                      <div className='flex gap-2'>
                        {!hasError && (
                          <Button
                            size='sm'
                            variant={'outline'}
                            disabled={isCurrSaving}
                            onClick={() => {
                              const content = getCopyRowCodeV2({
                                activeRowDepth: [blockIdx],
                              });
                              setEditingLayout({
                                blockIdx,
                                blockId: currBlock.id,
                                cmsData: {
                                  ...cmsSetting,
                                  name: currBlock.name,
                                  content,
                                  author,
                                  material_tags: [
                                    {
                                      name: selectedCategory,
                                      documentId: selectedCategory,
                                    },
                                  ],
                                },
                              });
                            }}
                          >
                            更新
                          </Button>
                        )}
                        <Button
                          disabled={isCurrSaving}
                          size='sm'
                          variant={'outline'}
                          onClick={async () => {
                            toast.loading('请等待删除完成');
                            await themePackV2Manager.removeItem(
                              cmsSetting.documentId
                            );
                            const resetSetting = {
                              ...(currBlock.cmsSettingForThemePack2 || {}),
                              documentId: '',
                            } as any;
                            setRowAttrsV2(
                              {
                                cmsSettingForThemePack2: resetSetting,
                              },
                              {
                                activeRowDepth: [blockIdx],
                              }
                            );
                            toast.dismiss();
                            toast.success('重删除完成');
                            onChange?.();
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    ) : (
                      <Button variant={'outline'} size='sm'>
                        未保存版式
                      </Button>
                    )}
                  </div>
                  <div className='row_content relative z-0'>{rowDOM}</div>
                </div>
              );
            }}
          />
        </div>
        <div className='footer_action'>
          <div>
            <IconInput
              value={author}
              placeholder='作者'
              onChange={e => {
                const newAuthor = e.target.value;
                if (newAuthor && newAuthor !== author) {
                  setAuthor(newAuthor);
                }
              }}
            />
          </div>
          <Button
            disabled={isSaving}
            onClick={async () => {
              toast.loading('请等待保存完成');
              if (isSaving) {
                toast.dismiss();
                toast.error('请等待保存完成');
                return;
              }
              if (!author) {
                toast.dismiss();
                toast.error('请输入作者');
                return;
              }
              const queue = gridsData.map((block, blockIdx) => {
                const cmsSetting = block.cmsSettingForThemePack2;
                const content = getCopyRowCodeV2({
                  activeRowDepth: [blockIdx],
                });
                return {
                  blockIdx,
                  blockId: block.id,
                  cmsData: {
                    ...cmsSetting,
                    name: block.name,
                    content,
                    author,
                    material_tags_documentId: selectedCategory,
                  },
                };
              });
              setBlockSaveStatus(
                queue.reduce(
                  (acc, item, index) => ({
                    ...acc,
                    [index]: { isSaving: true, error: '' },
                  }),
                  {}
                )
              );
              for (const item of queue) {
                try {
                  await handleSave(item as any);
                  setBlockSaveStatus(prev => ({
                    ...prev,
                    [item.blockIdx]: { isSaving: false, error: '' },
                  }));
                } catch (err) {
                  toast.error(`${item.cmsData?.name} 保存失败，正在重置...`);
                  setBlockSaveStatus(prev => ({
                    ...prev,
                    [item.blockIdx]: {
                      isSaving: true,
                      error: '坏掉了，正在重置...',
                    },
                  }));
                  const resetRes = await resetBlock(
                    item.cmsData,
                    item.blockId,
                    item.blockIdx
                  );
                  setBlockSaveStatus(prev => ({
                    ...prev,
                    [item.blockIdx]: {
                      isSaving: false,
                      error: '',
                    },
                  }));
                  await handleSave({
                    ...item,
                    cmsData: resetRes,
                  });
                  continue;
                }
              }
              onChange?.();
              toast.dismiss();
              toast.success('同步完成');
            }}
          >
            {isSaving ? '保存中...' : '保存全部'}
          </Button>
        </div>
      </RowRoot>
      <ResponsiveDialog
        isOpen={!!editingLayout}
        onOpenChange={nextVal => {
          setEditingLayout(nextVal ? editingLayout : null);
        }}
        title={editingLayout ? '编辑版式' : '新增版式'}
      >
        <UpdateMaterialItemForm
          materialItem={editingLayout?.cmsData}
          categories={categories}
          selectedCategory={selectedCategory}
          onClose={() => setEditingLayout(null)}
          onSubmit={async submitData => {
            handleSave({
              ...editingLayout,
              cmsData: {
                ...submitData,
                documentId: editingLayout.cmsData?.documentId,
              },
              material_tags_documentId:
                submitData.material_tags?.[0]?.documentId || selectedCategory,
            });
            setEditingLayout(null);
          }}
        />
      </ResponsiveDialog>
    </>
  );
}
