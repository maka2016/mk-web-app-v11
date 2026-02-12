import styled from '@emotion/styled';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import clas from 'classnames';
import {
  ComponentIcon,
  Copy,
  MoreVertical,
  RefreshCcw,
  Trash2,
  Unlink,
} from 'lucide-react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import ChangeBlockTrigger from '../../componentForContentLib/ThemeLayoutLibraryV3/ChangeComponentTrigger';
import { BtnLite } from '../../components/style-comps';
import { scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import ComponentGroupSelector from './ComponentGroupSelector';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
`;

const SettingSimpleModeRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  .title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    display: flex;
  }
  .footer_action {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    /* gap: 16px; */
    .label {
      font-size: 14px;
      color: #999;
    }
    .label2 {
      margin-left: 4px;
    }
    .btn_lite {
      padding: 0 8px;
    }
  }
`;

interface GridMoreOptionsProps {
  blockIdx: number;
}

const SettingBlockDesigner = (props: GridMoreOptionsProps) => {
  const { blockIdx } = props;
  const worksStore = useWorksStore();
  const { worksData } = worksStore;
  const { gridProps } = worksData;
  const gridsData = gridProps.gridsData;
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const {
    copyRowV2,
    pasteRowV2,
    getRowByDepth,
    deleteRowBatchV2,
    setRowAttrsV2,
    createComponent2,
  } = worksStore.gridPropsOperator;
  const { themePackV3Operator } = worksStore;
  const { activeRowDepth } = widgetStateV2;
  const { blockGroupData } = themePackV3Operator;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const currBlock = gridsData[blockIdx];
  const blockId = currBlock?.id || '';
  const isComponent = !!currBlock.componentGroupRefId;
  // const isTemplateMode = gridProps.worksCate !== 'theme';
  const isTemplateMode = false;

  // 处理名称编辑
  const handleNameEdit = () => {
    setEditName(currBlock.name || `画布 ${blockIdx + 1}`);
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    if (editName.trim() && editName.trim() !== currBlock.name) {
      setRowAttrsV2({ name: editName.trim() }, { activeRowDepth: [blockIdx] });
      toast.success('画布名称已更新');
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditName('');
    setIsEditingName(false);
  };

  return (
    <div style={{ position: 'relative', backgroundColor: '#eee' }}>
      <SettingSimpleModeRoot>
        <div className='title'>
          <Popover open={isEditingName} onOpenChange={setIsEditingName}>
            <PopoverTrigger asChild>
              <BtnLite2
                className='trggier px-2'
                style={{
                  pointerEvents: 'auto',
                }}
                onClick={handleNameEdit}
              >
                {currBlock.name || `画布 ${blockIdx + 1}`}
              </BtnLite2>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-3' side='bottom' align='start'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>画布名称</label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleNameSave();
                    } else if (e.key === 'Escape') {
                      handleNameCancel();
                    }
                  }}
                  placeholder='请输入画布名称'
                  autoFocus
                  className='h-8'
                />
                <div className='flex justify-end gap-2'>
                  <Button
                    onClick={handleNameCancel}
                    variant={'outline'}
                    size='sm'
                  >
                    取消
                  </Button>
                  <Button onClick={handleNameSave} size='sm'>
                    确定
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className='footer_action'>
          {!isTemplateMode && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <BtnLite2
                    isActive={isComponent}
                    activeColor={isComponent ? '#9747ff' : ''}
                    onClick={e => {
                      if (!gridProps.themePackV3) {
                        toast.error('请先保存主题');
                        (
                          document.querySelector('#save_theme_btn') as any
                        )?.click();
                        return;
                      }
                      if (currBlock.componentGroupRefId) {
                        // toast('已保存为组件');
                        // 将url的tab字段设置为component
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'blocks');
                        window.history.replaceState({}, '', url.toString());
                      }
                      setWidgetStateV2({
                        activeRowDepth: activeRowDepth,
                      });
                    }}
                  >
                    <ComponentIcon size={20} />
                  </BtnLite2>
                </PopoverTrigger>
                <PopoverContent
                  className='w-[300px] min-w-[148px] p-2'
                  side='bottom'
                  align='start'
                >
                  <ComponentGroupSelector
                    componentGroupData={blockGroupData}
                    activeGroupId={currBlock.componentGroupRefId}
                    onSelect={group => {
                      const createRes = createComponent2(
                        { activeRowDepth: [blockIdx] },
                        group.groupId
                      );
                      if (!createRes) {
                        toast.error('请先选择一个元素');
                        return;
                      }
                      if (
                        currBlock.componentGroupRefId &&
                        currBlock.sourceComponentId
                      ) {
                        const item = themePackV3Operator.getBlockItem(
                          currBlock.componentGroupRefId,
                          currBlock.sourceComponentId
                        );
                        if (item) {
                          // 移动到目标组
                          themePackV3Operator.moveBlockToGroup(
                            currBlock.sourceComponentId,
                            group.groupId
                          );
                          return;
                        } else {
                        }
                      }
                      try {
                        console.log('createRes', createRes);
                        themePackV3Operator.addBlockToGroup(
                          group.groupId,
                          createRes.data,
                          group.groupName
                        );
                        toast.success('添加组件成功');
                      } catch (error) {
                        // console.error('添加组件失败', error);
                        if (confirm('该组件已存在，是否覆盖？')) {
                          console.log('convertRes', createRes);
                          themePackV3Operator.updateBlockData(
                            createRes.componentGroupId,
                            createRes.data
                          );
                          toast('已更新组件');
                        } else {
                          toast('已取消更新组件');
                        }
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
          {isComponent && (
            <>
              <ChangeBlockTrigger />
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BtnLite2 className='col' onClick={e => {}}>
                <Copy size={20} />
              </BtnLite2>
            </AlertDialogTrigger>
            <AlertDialogContent className='w-[320px]'>
              <AlertDialogHeader>
                <AlertDialogTitle>想要复制这个画布吗？</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    // 使用新的 duplicateRowBatch 函数
                    copyRowV2({
                      activeRowDepth: [blockIdx],
                    });
                    const nextRowDepth = [blockIdx + 1];
                    pasteRowV2({
                      activeRowDepth: [blockIdx],
                    });
                    setWidgetStateV2({
                      activeRowDepth: nextRowDepth,
                      editingElemId: undefined,
                    });
                    // const newRowIds = duplicateRowBatchV2([blockId], {
                    //   repeatCount: 1,
                    //   insertToParent: true,
                    // });

                    // 滚动到第一个新复制的行
                    scrollToActiveRow(getRowByDepth(nextRowDepth)?.id || '');

                    toast.success('复制成功');
                  }}
                >
                  复制
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <BtnLite2 className={clas('col', {})}>
                <Trash2 size={20} />
              </BtnLite2>
            </AlertDialogTrigger>
            <AlertDialogContent className='w-[320px]'>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除这个页面吗？</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={e => {
                    deleteRowBatchV2([blockId]);
                    toast.success('删除成功');
                  }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isComponent && (
            <Popover>
              <PopoverTrigger asChild>
                <BtnLite2 onClick={e => {}}>
                  <MoreVertical size={20} />
                </BtnLite2>
              </PopoverTrigger>
              <PopoverContent
                className='w-[148px] p-2 px-1'
                side='bottom'
                align='end'
              >
                <BtnLite2
                  onClick={() => {
                    const createRes = createComponent2({
                      activeRowDepth: [blockIdx],
                    });
                    if (!createRes) {
                      toast.error('请先选择一个元素');
                      return;
                    }
                    console.log('createRes', createRes);
                    themePackV3Operator.updateBlockData(
                      createRes.componentGroupId,
                      toJS(createRes.data)
                    );
                    toast.success('同步成功');
                  }}
                >
                  <RefreshCcw size={16} />
                  同步到版式库
                </BtnLite2>
                <BtnLite2
                  style={{
                    color: 'red',
                  }}
                  onClick={() => {
                    setRowAttrsV2(
                      {
                        componentGroupRefId: undefined,
                        sourceComponentId: undefined,
                      },
                      {
                        activeRowDepth: [blockIdx],
                      }
                    );
                    toast.success('取消成功');
                  }}
                >
                  <Unlink size={16} />
                  取消版式关联
                </BtnLite2>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </SettingSimpleModeRoot>
    </div>
  );
};

export default observer(SettingBlockDesigner);
